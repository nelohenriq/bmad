import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipWrapper, TooltipProvider } from '@/components/ui/tooltip'

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <TooltipProvider delayDuration={0}>
      {component}
    </TooltipProvider>
  )
}

describe('TooltipWrapper', () => {
  it('renders trigger content', () => {
    renderWithProvider(
      <TooltipWrapper content="Tooltip content">
        <button>Hover me</button>
      </TooltipWrapper>
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <TooltipWrapper content="Tooltip content" delayDuration={0}>
        <button>Hover me</button>
      </TooltipWrapper>
    )

    const trigger = screen.getByText('Hover me')
    await user.hover(trigger)

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
  })


  it('shows tooltip on focus', async () => {
    renderWithProvider(
      <TooltipWrapper content="Tooltip content" delayDuration={0}>
        <button>Focus me</button>
      </TooltipWrapper>
    )

    const trigger = screen.getByText('Focus me')
    fireEvent.focus(trigger)

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <TooltipWrapper content="Tooltip content" delayDuration={0}>
        <button>Hover me</button>
      </TooltipWrapper>
    )

    const trigger = screen.getByText('Hover me')
    await user.hover(trigger)
    expect(trigger).toHaveAttribute('aria-describedby')
  })
})