export interface QuestionOption {
  value: string
  label: string
  sub?: string
}

export interface Question {
  id: string
  prompt: string
  type: 'single' | 'multi'
  options: QuestionOption[]
  allowCustom?: boolean
  autoDetected?: string[]
}

export const QUESTIONS: Question[] = [
  {
    id: 'role',
    prompt: '你日常的主要角色?',
    type: 'single',
    options: [
      { value: 'pm', label: '产品经理', sub: '需求分析、项目规划、团队协调' },
      { value: 'engineer', label: '工程师', sub: '编码实现、技术方案、Bug 修复' },
      { value: 'lead', label: '技术负责人', sub: '架构设计、代码评审、技术决策' },
      { value: 'data', label: '数据工程师', sub: '数据处理、模型训练、数据分析' },
      { value: 'fullstack', label: '全栈', sub: '前端后端都搞，看需求来' },
    ],
  },
  {
    id: 'experience',
    prompt: '你的技术经验?',
    type: 'single',
    options: [
      { value: 'junior', label: '初级（< 2 年）', sub: '正在学习，需要更多解释' },
      { value: 'mid', label: '中级（2-5 年）', sub: '有经验，能独立完成大部分任务' },
      { value: 'senior', label: '高级（5 年+）', sub: '资深，给我结论就行' },
    ],
  },
  {
    id: 'tech_stack',
    prompt: '你最常用的语言 / 框架?',
    type: 'multi',
    allowCustom: true,
    autoDetected: [],
    options: [
      { value: 'Python', label: 'Python' },
      { value: 'TypeScript', label: 'TypeScript' },
      { value: 'JavaScript', label: 'JavaScript' },
      { value: 'Go', label: 'Go' },
      { value: 'Rust', label: 'Rust' },
      { value: 'Java', label: 'Java' },
      { value: 'C++', label: 'C++' },
      { value: 'Ruby', label: 'Ruby' },
      { value: 'PHP', label: 'PHP' },
      { value: 'Swift', label: 'Swift' },
      { value: 'Kotlin', label: 'Kotlin' },
    ],
  },
  {
    id: 'review_style',
    prompt: '你们团队的代码评审风格?',
    type: 'single',
    options: [
      { value: 'strict', label: '严格', sub: '完整 review、逐行检查，质量第一' },
      { value: 'lightweight', label: '轻量', sub: '关注逻辑和架构，细节不管' },
      { value: 'fast', label: '快速合并', sub: '小改动直接合，大改动才看' },
    ],
  },
  {
    id: 'decision_style',
    prompt: '遇到不确定的需求时，你倾向于?',
    type: 'single',
    options: [
      { value: 'ask', label: '先问', sub: '我来拍板再动手，别浪费时间做错' },
      { value: 'act', label: '先做', sub: '出了方案再讨论，有东西看更高效' },
      { value: 'flexible', label: '看情况', sub: '让 AI 判断何时需要问我' },
    ],
  },
  {
    id: 'test_approach',
    prompt: '你写代码时的测试习惯?',
    type: 'single',
    options: [
      { value: 'tdd', label: '先写测试（TDD）', sub: '红 → 绿 → 重构' },
      { value: 'after', label: '写完代码再补测试', sub: '功能先跑通，然后加覆盖' },
      { value: 'critical', label: '关键逻辑才写测试', sub: '核心路径有保障，其他的看情况' },
      { value: 'ci', label: '测试交给 CI', sub: '自动化处理，我不主动写' },
    ],
  },
  {
    id: 'communication',
    prompt: '你希望 AI 回复的风格?',
    type: 'single',
    options: [
      { value: 'concise', label: '简洁', sub: '只给结论和代码，别废话' },
      { value: 'standard', label: '标准', sub: '结论 + 简要说明，够用就行' },
      { value: 'detailed', label: '详细', sub: '完整的思路和解释，我要理解透彻' },
    ],
  },
]

export const SUMMARY_CATEGORIES = [
  { cat: '角色', id: 'role', color: '#ffdb33' },
  { cat: '经验', id: 'experience', color: '#8B5CF6' },
  { cat: '技术栈', id: 'tech_stack', color: '#22c55e' },
  { cat: '代码评审', id: 'review_style', color: '#f97316' },
  { cat: '决策风格', id: 'decision_style', color: '#3b82f6' },
  { cat: '测试习惯', id: 'test_approach', color: '#ec4899' },
  { cat: '沟通偏好', id: 'communication', color: '#14b8a6' },
]
