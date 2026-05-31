# ARENA Audio System Documentation

## Overview

ARENA features a comprehensive Web Audio API-based sound system with programmatically generated sounds. No audio files are required - all sounds are synthesized in real-time using oscillators and gain nodes.

## Audio Features

### 1. Ambient Bass Hum (Continuous)
- **Description**: Deep atmospheric background sound that plays continuously
- **Implementation**: Two sine wave oscillators
  - Oscillator 1: 60Hz at 0.08 gain
  - Oscillator 2: 120Hz at 0.04 gain
- **Purpose**: Creates an immersive gaming atmosphere
- **Auto-start**: Begins on first user interaction (click)

### 2. Button Click Sound
- **Description**: Short, crisp click sound for all button interactions
- **Implementation**: Single sine wave oscillator
  - Frequency: 800Hz
  - Duration: 0.05 seconds
  - Gain: 0.1
- **Trigger**: Automatically plays on every button click throughout the app
- **Integration**: Built into the Button component

### 3. Tournament Join Arpeggio
- **Description**: Rising three-note synth sequence for tournament entry
- **Implementation**: Three sequential sine wave oscillators
  - Note 1: 220Hz (A3)
  - Note 2: 330Hz (E4)
  - Note 3: 440Hz (A4)
  - Duration per note: 0.15 seconds
  - Gain: 0.25
- **Trigger**: Plays when clicking the JOIN button on tournament cards
- **Purpose**: Provides satisfying feedback for important actions

### 4. Match Start Bass Drop
- **Description**: Deep bass drop effect for match start events
- **Implementation**: Single sine wave oscillator with frequency ramp
  - Start frequency: 55Hz
  - End frequency: 110Hz (one octave up)
  - Duration: 0.5 seconds
  - Gain: 0.5
  - Ramp type: Exponential
- **Trigger**: Can be called when a match begins (ready for implementation)
- **Purpose**: Creates excitement and anticipation

## Audio Controls

### Volume Control
- **Location**: Top navigation bar (speaker icon)
- **Features**:
  - Mute/unmute toggle button
  - Volume slider (0-100%)
  - Visual feedback showing current volume percentage
  - Persistent across page navigation

### Implementation Details

#### Audio Context
- Uses Web Audio API's AudioContext
- Initializes on first user interaction (required by browsers)
- Master gain node controls overall volume
- Separate gain nodes for each sound type

#### Architecture
```
AudioContext
  └── MasterGain (controlled by volume slider)
      ├── AmbientGain (continuous bass hum)
      │   ├── Oscillator 1 (60Hz)
      │   └── Oscillator 2 (120Hz)
      └── Individual sound effects
          ├── Button clicks
          ├── Tournament join arpeggio
          └── Match start bass drop
```

## Usage in Code

### Playing Sounds

```typescript
import { useAudio } from '@/contexts/AudioContext';

function MyComponent() {
  const { playButtonClick, playTournamentJoin, playMatchStart } = useAudio();

  const handleAction = () => {
    // Button clicks are automatic
    // For custom sounds:
    playTournamentJoin(); // Play arpeggio
    playMatchStart(); // Play bass drop
  };

  return <button onClick={handleAction}>Action</button>;
}
```

### Accessing Audio Controls

```typescript
import { useAudio } from '@/contexts/AudioContext';

function AudioSettings() {
  const { isMuted, setIsMuted, volume, setVolume } = useAudio();

  return (
    <div>
      <button onClick={() => setIsMuted(!isMuted)}>
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
      />
    </div>
  );
}
```

## Browser Compatibility

- **Supported**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Fallback**: Gracefully fails silently if Web Audio API is not supported
- **Autoplay Policy**: Respects browser autoplay policies by initializing on user interaction

## Performance Considerations

- **CPU Usage**: Minimal - oscillators are hardware-accelerated
- **Memory**: Very low - no audio files to load
- **Latency**: Near-zero - sounds are generated in real-time
- **Cleanup**: Audio context is properly closed on component unmount

## Future Enhancements

Potential additions to the audio system:

1. **Match Events**:
   - Victory fanfare (ascending major chord)
   - Defeat sound (descending minor chord)
   - Countdown timer beeps (increasing pitch)

2. **UI Feedback**:
   - Hover sounds for interactive elements
   - Error notification sound
   - Success notification sound

3. **Ambient Variations**:
   - Different ambient tracks for different game types
   - Dynamic music that responds to user actions

4. **User Preferences**:
   - Save volume settings to localStorage
   - Individual volume controls for different sound types
   - Sound theme selection

## Technical Notes

### Why Web Audio API?

- **No Dependencies**: Pure browser API, no libraries needed
- **Precise Timing**: Sample-accurate scheduling
- **Low Latency**: Real-time synthesis
- **Flexible**: Easy to create complex sounds programmatically
- **Small Bundle**: No audio files to download

### Sound Design Philosophy

All sounds are designed to be:
- **Subtle**: Not intrusive or annoying
- **Informative**: Provide clear feedback
- **Consistent**: Match the esports/gaming aesthetic
- **Accessible**: Can be muted or adjusted by users

## Troubleshooting

### Sound Not Playing?
1. Check if browser supports Web Audio API
2. Ensure user has interacted with the page (click/tap)
3. Check if sound is muted in browser or OS
4. Verify volume slider is not at 0%

### Ambient Hum Not Starting?
- The ambient hum starts on first user interaction
- Try clicking anywhere on the page
- Check browser console for errors

### Volume Control Not Working?
- Ensure AudioProvider is wrapping the app
- Check that useAudio hook is being called within AudioProvider
- Verify browser permissions for audio playback

## Credits

Sound design and implementation by the ARENA development team using Web Audio API.
