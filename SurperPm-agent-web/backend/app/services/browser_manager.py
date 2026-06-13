from __future__ import annotations

import asyncio
import base64
import logging
import uuid
from collections.abc import Awaitable, Callable

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

log = logging.getLogger(__name__)

_SCREENCAST_OPTS = {
    "format": "jpeg",
    "quality": 60,
    "maxWidth": 1280,
    "maxHeight": 960,
    "everyNthFrame": 2,
}


class BrowserManager:
    def __init__(self) -> None:
        self._pw = None
        self._browser: Browser | None = None
        self._contexts: dict[str, BrowserContext] = {}
        self._pages: dict[tuple[str, str, str], Page] = {}
        self._cdp_sessions: dict[tuple[str, str, str], object] = {}
        self._page_info: dict[tuple[str, str, str], dict] = {}
        self._frame_cbs: dict[tuple[str, str], Callable[[bytes], Awaitable[None]]] = {}
        self._nav_cbs: dict[tuple[str, str], Callable[[str, str], Awaitable[None]]] = {}
        self._tabs_cbs: dict[tuple[str, str], Callable[[], Awaitable[None]]] = {}
        self._download_cbs: dict[tuple[str, str], Callable[[str, bytes], Awaitable[None]]] = {}
        self._active_tabs: dict[tuple[str, str], str] = {}

    async def start(self) -> None:
        try:
            self._pw = await async_playwright().start()
            self._browser = await self._pw.chromium.launch(headless=True)
            log.info("BrowserManager: Chromium launched")
        except Exception as exc:
            log.warning("BrowserManager: failed to launch (%s) — shared browser disabled", exc)
            self._pw = None
            self._browser = None

    async def stop(self) -> None:
        for key in list(self._pages):
            await self._remove_page(*key)
        for ctx in self._contexts.values():
            await ctx.close()
        self._contexts.clear()
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._pw:
            await self._pw.stop()
            self._pw = None
        log.info("BrowserManager: shut down")

    async def _get_context(self, workspace_id: str) -> BrowserContext:
        if workspace_id not in self._contexts:
            assert self._browser is not None
            ctx = await self._browser.new_context(
                viewport={"width": 1280, "height": 960},
                locale="zh-CN",
                permissions=["clipboard-read", "clipboard-write"],
            )
            self._contexts[workspace_id] = ctx
        return self._contexts[workspace_id]

    def set_callbacks(
        self,
        workspace_id: str,
        user_id: str,
        on_frame: Callable[[bytes], Awaitable[None]],
        on_navigated: Callable[[str, str], Awaitable[None]],
        on_tabs_changed: Callable[[], Awaitable[None]],
        on_download: Callable[[str, bytes], Awaitable[None]] | None = None,
    ) -> None:
        ukey = (workspace_id, user_id)
        self._frame_cbs[ukey] = on_frame
        self._nav_cbs[ukey] = on_navigated
        self._tabs_cbs[ukey] = on_tabs_changed
        if on_download:
            self._download_cbs[ukey] = on_download

    async def create_tab(
        self,
        workspace_id: str,
        user_id: str,
        tab_id: str | None = None,
    ) -> tuple[Page, str]:
        ukey = (workspace_id, user_id)
        if tab_id is None:
            tab_id = uuid.uuid4().hex[:8]

        pkey = (workspace_id, user_id, tab_id)
        if pkey in self._pages:
            return self._pages[pkey], tab_id

        ctx = await self._get_context(workspace_id)
        page = await ctx.new_page()
        self._pages[pkey] = page
        self._page_info[pkey] = {"url": "about:blank", "title": ""}

        cdp = await ctx.new_cdp_session(page)
        self._cdp_sessions[pkey] = cdp

        async def _on_frame(params: dict) -> None:
            frame_data = base64.b64decode(params["data"])
            cb = self._frame_cbs.get(ukey)
            if cb:
                await cb(frame_data)
            await cdp.send("Page.screencastFrameAck", {"sessionId": params["sessionId"]})

        cdp.on("Page.screencastFrame", lambda params: asyncio.ensure_future(_on_frame(params)))

        def _on_nav(frame):
            if frame == page.main_frame:
                asyncio.ensure_future(self._handle_nav(ukey, pkey, page))

        page.on("framenavigated", _on_nav)

        async def _on_download(download) -> None:
            try:
                path = await download.path()
                if path:
                    data = await asyncio.to_thread(self._read_file, str(path))
                    cb = self._download_cbs.get(ukey)
                    if cb:
                        await cb(download.suggested_filename, data)
            except Exception:
                log.exception("BrowserManager: download handling failed")

        page.on("download", lambda dl: asyncio.ensure_future(_on_download(dl)))

        is_first = ukey not in self._active_tabs
        if is_first:
            self._active_tabs[ukey] = tab_id
            await cdp.send("Page.startScreencast", _SCREENCAST_OPTS)

        await page.goto("about:blank")
        log.info("BrowserManager: created tab %s for %s/%s", tab_id, workspace_id, user_id)
        return page, tab_id

    async def _handle_nav(
        self,
        ukey: tuple[str, str],
        pkey: tuple[str, str, str],
        page: Page,
    ) -> None:
        url = page.url
        try:
            title = await page.title()
        except Exception:
            title = ""
        self._page_info[pkey] = {"url": url, "title": title}

        tab_id = pkey[2]
        if self._active_tabs.get(ukey) == tab_id:
            cb = self._nav_cbs.get(ukey)
            if cb:
                await cb(url, title)

        tabs_cb = self._tabs_cbs.get(ukey)
        if tabs_cb:
            await tabs_cb()

    async def switch_tab(self, workspace_id: str, user_id: str, tab_id: str) -> Page | None:
        ukey = (workspace_id, user_id)
        pkey = (workspace_id, user_id, tab_id)
        if pkey not in self._pages:
            return None

        old_tab = self._active_tabs.get(ukey)
        if old_tab == tab_id:
            return self._pages[pkey]

        if old_tab:
            old_cdp = self._cdp_sessions.get((workspace_id, user_id, old_tab))
            if old_cdp:
                try:
                    await old_cdp.send("Page.stopScreencast", {})
                except Exception:
                    pass

        self._active_tabs[ukey] = tab_id
        new_cdp = self._cdp_sessions.get(pkey)
        if new_cdp:
            await new_cdp.send("Page.startScreencast", _SCREENCAST_OPTS)

        page = self._pages[pkey]
        info = self._page_info.get(pkey, {})
        cb = self._nav_cbs.get(ukey)
        if cb:
            await cb(info.get("url", page.url), info.get("title", ""))

        return page

    async def close_tab(self, workspace_id: str, user_id: str, tab_id: str) -> None:
        ukey = (workspace_id, user_id)
        pkey = (workspace_id, user_id, tab_id)
        if pkey not in self._pages:
            return

        was_active = self._active_tabs.get(ukey) == tab_id
        await self._remove_page(workspace_id, user_id, tab_id)

        if was_active:
            remaining = [
                k[2] for k in self._pages if k[0] == workspace_id and k[1] == user_id
            ]
            if remaining:
                await self.switch_tab(workspace_id, user_id, remaining[0])
            else:
                self._active_tabs.pop(ukey, None)

    def list_tabs(self, workspace_id: str, user_id: str) -> tuple[list[dict], str | None]:
        ukey = (workspace_id, user_id)
        active = self._active_tabs.get(ukey)
        tabs = []
        for (ws, uid, tid) in self._pages:
            if ws == workspace_id and uid == user_id:
                info = self._page_info.get((ws, uid, tid), {})
                tabs.append({"id": tid, "url": info.get("url", ""), "title": info.get("title", "")})
        return tabs, active

    def get_active_page(self, workspace_id: str, user_id: str) -> Page | None:
        ukey = (workspace_id, user_id)
        active = self._active_tabs.get(ukey)
        if active is None:
            return None
        return self._pages.get((workspace_id, user_id, active))

    async def _remove_page(self, workspace_id: str, user_id: str, tab_id: str) -> None:
        key = (workspace_id, user_id, tab_id)
        cdp = self._cdp_sessions.pop(key, None)
        if cdp:
            try:
                await cdp.send("Page.stopScreencast", {})
                await cdp.detach()
            except Exception:
                pass
        self._page_info.pop(key, None)
        page = self._pages.pop(key, None)
        if page:
            try:
                await page.close()
            except Exception:
                pass

    async def remove_all_pages(self, workspace_id: str, user_id: str) -> None:
        keys = [k for k in self._pages if k[0] == workspace_id and k[1] == user_id]
        for key in keys:
            await self._remove_page(*key)
        ukey = (workspace_id, user_id)
        self._frame_cbs.pop(ukey, None)
        self._nav_cbs.pop(ukey, None)
        self._tabs_cbs.pop(ukey, None)
        self._download_cbs.pop(ukey, None)
        self._active_tabs.pop(ukey, None)

    @staticmethod
    def _read_file(path: str) -> bytes:
        with open(path, "rb") as f:
            return f.read()

    async def navigate(self, page: Page, url: str) -> None:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)

    async def handle_mouse(self, page: Page, data: dict) -> None:
        action = data.get("action", "click")
        x, y = data.get("x", 0), data.get("y", 0)
        button = data.get("button", "left")

        if action == "move":
            await page.mouse.move(x, y)
        elif action == "click":
            await page.mouse.click(x, y, button=button)
        elif action == "dblclick":
            await page.mouse.dblclick(x, y, button=button)
        elif action == "down":
            await page.mouse.down(button=button)
        elif action == "up":
            await page.mouse.up(button=button)

    async def handle_scroll(self, page: Page, data: dict) -> None:
        x, y = data.get("x", 0), data.get("y", 0)
        dx, dy = data.get("deltaX", 0), data.get("deltaY", 0)
        await page.mouse.move(x, y)
        await page.evaluate(f"window.scrollBy({dx}, {dy})")

    async def handle_key(self, page: Page, data: dict) -> None:
        key = data.get("key", "")
        modifiers = data.get("modifiers", [])
        for mod in modifiers:
            await page.keyboard.down(mod)
        await page.keyboard.press(key)
        for mod in reversed(modifiers):
            await page.keyboard.up(mod)

    async def handle_type(self, page: Page, data: dict) -> None:
        text = data.get("text", "")
        if text:
            await page.keyboard.type(text)

    async def handle_resize(self, page: Page, data: dict) -> None:
        width = data.get("width", 1280)
        height = data.get("height", 960)
        await page.set_viewport_size({"width": width, "height": height})
        key = None
        for k, p in self._pages.items():
            if p == page:
                key = k
                break
        if key:
            cdp = self._cdp_sessions.get(key)
            if cdp:
                await cdp.send("Page.stopScreencast", {})
                await cdp.send("Page.startScreencast", {
                    "format": "jpeg",
                    "quality": 60,
                    "maxWidth": width,
                    "maxHeight": height,
                    "everyNthFrame": 2,
                })


browser_manager = BrowserManager()
