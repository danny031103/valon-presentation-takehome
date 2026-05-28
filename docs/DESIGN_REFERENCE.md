# Design Reference — Valon UI

Reference 1: https://www.valon.ai
Reference 2: docs/design-reference.png


## Fonts
- Body: Plus Jakarta Sans
- Display: DM Serif Display  
- Mono: Geist Mono
- Smoothing: antialiased
- Line height: 1.5

## Colors
```css
:root {
  --background:    hsl(36, 28%, 99%);
  --surface:       hsl(36, 33%, 97%);
  --surface-raised: hsl(33, 22%, 93%);
  --border:        hsl(30, 18%, 87%);
  --foreground:    hsl(24, 30%, 11%);
  --brand:         #7a4f10;
  --brand-soft:    #eac59f;
  --danger:        #c75050;
  --success:       #3d6b3d;
  --radius:        0.75rem;
}
```

## Background gradient
```css
background: radial-gradient(140% 90% at 50% 100%, #eaccb8 0%, #fdfcf9 50%, #f8f6f3 80%);
```

## Map existing app variables
```css
:root {
  --bg:       hsl(36, 28%, 99%);
  --paper:    hsl(33, 22%, 93%);
  --ink:      hsl(24, 30%, 11%);
  --accent:   #7a4f10;
  --accent-2: #eac59f;
  --edge:     hsl(30, 18%, 87%);
}
```

## Rules
- Left-aligned layouts, generous whitespace
- 1px borders using --border, no heavy shadows
- Buttons: normal weight, plain English labels, never uppercase
- No bright colors, no Comic Sans, no black outlines