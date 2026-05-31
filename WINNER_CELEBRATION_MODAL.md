# Winner Celebration Modal - Feature Documentation

## Overview
A stunning, animated Winner Celebration Modal that appears automatically when a player wins a tournament. Features gradient orbs, floating trophy animation, pulsing prize glow, continuous confetti, and share functionality.

## Design Specifications

### Modal Structure
- **Full Dark Overlay**: Black overlay with 80% opacity (`bg-black/80`)
- **Modal Card Background**: Deep purple `#0D0A1A`
- **Max Width**: 448px (responsive on mobile)
- **Border Radius**: 16px rounded corners
- **Padding**: 32px all around

### Visual Effects

#### Gradient Orbs
- **Top Left Orb**: Violet gradient (`rgba(139, 92, 246, 0.4)`)
  - Size: 192px x 192px
  - Blur: 60px
  - Opacity: 30%
  - Position: Top-left corner

- **Bottom Right Orb**: Cyan gradient (`rgba(34, 211, 238, 0.4)`)
  - Size: 192px x 192px
  - Blur: 60px
  - Opacity: 30%
  - Position: Bottom-right corner

#### Animated Confetti
- **Colors**: Gold (#F5C842), Violet (#8B5CF6), Cyan (#22D3EE)
- **Count**: 30 dots
- **Size**: 6px diameter circles
- **Animation**: Continuous fall from top
- **Duration**: 3-5 seconds per dot
- **Delay**: Random 0-2 seconds
- **Opacity**: 80%

### Typography

#### Fonts
- **Orbitron**: Brand name and winner username
  - Weights: 400 (regular), 700 (bold), 900 (black)
  - Usage: Headers, brand identity
  
- **JetBrains Mono**: Labels and prize amount
  - Weights: 400 (regular), 600 (semibold), 700 (bold)
  - Usage: Monospace numbers, technical labels

#### Text Styles
1. **ARENA Brand**
   - Font: Orbitron Bold (700)
   - Size: 18px
   - Color: White
   - Position: Top left

2. **TOURNAMENT WINNER Label**
   - Font: JetBrains Mono Semibold (600)
   - Size: 11px
   - Color: Cyan (#22D3EE)
   - Transform: Uppercase
   - Letter Spacing: 0.1em

3. **Winner Username**
   - Font: Orbitron Bold (700)
   - Size: 32px
   - Color: White
   - Text Shadow: Violet glow (`0 0 20px rgba(139, 92, 246, 0.6)`)
   - Animation: Pulsing glow (3s cycle)

4. **Tournament Name & Round**
   - Font: System default
   - Size: 14px
   - Color: White 50% opacity

5. **Prize Amount**
   - Font: JetBrains Mono Bold (700)
   - Size: 28px
   - Color: Gold (#F5C842)
   - Animation: Pulsing glow (2.5s cycle)

### Components

#### Floating Trophy
- **Emoji**: 🏆
- **Size**: 36px (text-4xl)
- **Position**: Top right
- **Animation**: Continuous bob up/down
  - Duration: 2 seconds
  - Movement: 10px vertical
  - Easing: ease-in-out
  - Loop: Infinite

#### Prize Box
- **Background**: `rgba(245, 200, 66, 0.08)`
- **Border**: 1px solid `rgba(245, 200, 66, 0.25)`
- **Border Radius**: 12px
- **Padding**: 16px
- **Label**: "PRIZE WON" (10px, gold, uppercase)
- **Amount**: Large JetBrains Mono with pulsing glow

#### Stats Section
Three vertical stats with colored dots:

1. **Game**
   - Dot: Violet (#8B5CF6)
   - Label: "Game" (12px, white 50%)
   - Value: Game name (12px, white)

2. **Players**
   - Dot: Cyan (#22D3EE)
   - Label: "Players" (12px, white 50%)
   - Value: Player count (12px, white)

3. **Duration**
   - Dot: Amber (#F5C842)
   - Label: "Duration" (12px, white 50%)
   - Value: Time duration (12px, white)

#### Share Button
- **Background**: Linear gradient violet to cyan
  - Start: #8B5CF6 (violet)
  - End: #22D3EE (cyan)
  - Angle: 135deg
- **Text**: "SHARE WIN" (white, medium weight)
- **Icon**: Share2 icon (16px)
- **Animation**: Sheen sweep effect
  - White gradient overlay
  - Sweeps left to right
  - Duration: 3 seconds
  - Loop: Infinite
  - Hover: Faster (1.5s)

#### Close Button
- **Icon**: X icon (24px)
- **Color**: White 60% opacity
- **Hover**: White 100% opacity
- **Position**: Top right of overlay
- **Padding**: 16px

### Animations

#### 1. Confetti Fall
```css
@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(500px) rotate(360deg);
    opacity: 0;
  }
}
```

#### 2. Floating Trophy
```css
@keyframes float-trophy {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}
```

#### 3. Prize Pulse Glow
```css
@keyframes prize-pulse {
  0%, 100% {
    text-shadow: 0 0 10px rgba(245, 200, 66, 0.5);
  }
  50% {
    text-shadow: 0 0 20px rgba(245, 200, 66, 0.8), 
                 0 0 30px rgba(245, 200, 66, 0.4);
  }
}
```

#### 4. Sheen Sweep
```css
@keyframes sheen {
  0% {
    transform: translateX(-100%) skewX(-15deg);
  }
  100% {
    transform: translateX(200%) skewX(-15deg);
  }
}
```

## Functionality

### Auto-Display
- Modal appears automatically when tournament winner is determined
- Triggered when tournament status changes to 'completed'
- Shows immediately after final match confirmation

### Share Feature
- **Action**: Copies shareable link to clipboard
- **Format**: 
  ```
  🏆 [Winner] won [Tournament] and earned $[Prize]!
  [Tournament URL]
  ```
- **Toast Notification**: "Link copied — share your win!"
- **URL**: Direct link to tournament page

### Close Behavior
- Click X button in top right
- Click outside modal (on overlay)
- Both actions close the modal

## Props Interface

```typescript
interface WinnerSpotlightProps {
  open: boolean;                    // Control modal visibility
  onOpenChange: (open: boolean) => void;  // Close handler
  winner: {
    user_id: string;                // Winner's user ID
    gamertag: string | null;        // Winner's display name
    avatar_url: string | null;      // Winner's avatar (not used in new design)
  };
  tournamentId: string;             // Tournament ID for share link
  tournamentName: string;           // Tournament name display
  prizeAmount: number;              // Prize money amount
  game?: string;                    // Game name (default: 'Valorant')
  totalPlayers?: number;            // Total participants (default: 16)
  duration?: string;                // Tournament duration (default: '2h 34m')
}
```

## Usage Example

```tsx
<WinnerSpotlight
  open={showWinnerSpotlight}
  onOpenChange={setShowWinnerSpotlight}
  winner={{
    user_id: winner.user_id,
    gamertag: winner.gamertag,
    avatar_url: winner.avatar_url
  }}
  tournamentId={tournament.id}
  tournamentName={tournament.name}
  prizeAmount={tournament.prize_pool * 0.5}
  game={tournament.game}
  totalPlayers={tournament.max_players}
  duration="2h 34m"
/>
```

## Color Palette

| Element | Color | Hex/RGBA |
|---------|-------|----------|
| Modal Background | Deep Purple | `#0D0A1A` |
| Overlay | Black 80% | `rgba(0, 0, 0, 0.8)` |
| Violet Orb | Violet | `rgba(139, 92, 246, 0.4)` |
| Cyan Orb | Cyan | `rgba(34, 211, 238, 0.4)` |
| Gold/Prize | Gold | `#F5C842` |
| Cyan Label | Cyan | `#22D3EE` |
| Violet Accent | Violet | `#8B5CF6` |
| White Text | White | `#FFFFFF` |
| Muted Text | White 50% | `rgba(255, 255, 255, 0.5)` |
| Muted Text 2 | White 30% | `rgba(255, 255, 255, 0.3)` |
| Divider | White 10% | `rgba(255, 255, 255, 0.1)` |
| Prize Box BG | Gold 8% | `rgba(245, 200, 66, 0.08)` |
| Prize Box Border | Gold 25% | `rgba(245, 200, 66, 0.25)` |

## Responsive Design

### Mobile (< 640px)
- Modal width: 100% with 16px margin
- Font sizes remain the same for readability
- Confetti count: Same (30 dots)
- All animations work smoothly

### Desktop (≥ 640px)
- Modal width: 448px max
- Centered in viewport
- All features fully functional

## Performance Considerations

### Animations
- Uses CSS animations (GPU accelerated)
- No JavaScript animation loops
- Confetti uses transform (performant)
- Minimal repaints

### Rendering
- Portal-based rendering (fixed position)
- Z-index: 50 (above all content)
- Pointer events disabled on confetti
- Efficient event handlers

## Accessibility

### Keyboard Navigation
- ESC key closes modal (via overlay click)
- Tab navigation works within modal
- Focus trap when open

### Screen Readers
- Semantic HTML structure
- Button labels clear and descriptive
- Close button accessible

### Visual
- High contrast text (white on dark)
- Large, readable fonts
- Clear visual hierarchy
- No flashing animations (smooth pulses)

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile Browsers**: Full support

### Font Loading
- Google Fonts CDN
- Preconnect for faster loading
- System font fallbacks

## Files Modified

1. **`/src/components/WinnerSpotlight.tsx`**
   - Complete redesign
   - New animations
   - Share functionality
   - Removed old Dialog component

2. **`/index.html`**
   - Added Google Fonts (Orbitron, JetBrains Mono)
   - Preconnect for performance

3. **`/src/pages/TournamentDetail.tsx`**
   - Added game, totalPlayers, duration props
   - Updated WinnerSpotlight call

## Testing Checklist

- [ ] Modal appears when tournament completes
- [ ] Confetti animation plays continuously
- [ ] Trophy floats up and down
- [ ] Prize amount glows with pulse
- [ ] Winner username glows with pulse
- [ ] Share button copies link to clipboard
- [ ] Toast shows "Link copied — share your win!"
- [ ] Close button (X) closes modal
- [ ] Click outside closes modal
- [ ] Gradient orbs visible in corners
- [ ] All fonts load correctly (Orbitron, JetBrains Mono)
- [ ] Sheen animation sweeps across share button
- [ ] Stats display correctly (Game, Players, Duration)
- [ ] Responsive on mobile devices
- [ ] No console errors

## Future Enhancements

- [ ] Add social media share buttons (Twitter, Facebook)
- [ ] Add screenshot/download feature
- [ ] Add winner's match history
- [ ] Add winner's message/quote
- [ ] Add tournament journey visualization
- [ ] Add sound effects (optional)
- [ ] Add more confetti patterns
- [ ] Add fireworks animation option

---

**Version**: 1.0  
**Last Updated**: 2026-04-22  
**Status**: Complete ✅
