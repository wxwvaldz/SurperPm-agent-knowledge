import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('sanity', () => {
  it('renders a basic element', () => {
    render(<h1>SuperPmAgent</h1>)
    expect(screen.getByText('SuperPmAgent')).toBeInTheDocument()
  })
})
