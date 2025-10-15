/**
 * Maps Windows virtual key codes to human-readable key names
 * Based on the key codes used in the bot detection system
 */
export const keyCodeToName: { [key: number]: string } = {
  // Letters
  30: 'A', 48: 'B', 46: 'C', 32: 'D', 18: 'E', 33: 'F', 34: 'G', 35: 'H',
  23: 'I', 36: 'J', 37: 'K', 38: 'L', 50: 'M', 49: 'N', 24: 'O', 25: 'P',
  16: 'Q', 19: 'R', 31: 'S', 20: 'T', 22: 'U', 47: 'V', 17: 'W', 45: 'X',
  21: 'Y', 44: 'Z',

  // Numbers (top row)
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',

  // Function keys
  59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4', 63: 'F5', 64: 'F6',
  65: 'F7', 66: 'F8', 67: 'F9', 68: 'F10', 87: 'F11', 88: 'F12',

  // Special keys
  1: 'Escape',
  14: 'Backspace',
  15: 'Tab',
  28: 'Enter',
  29: 'Left Ctrl',
  42: 'Left Shift',
  54: 'Right Shift',
  56: 'Left Alt',
  57: 'Space',
  58: 'Caps Lock',

  // Arrow keys
  60999: 'Left Arrow',
  61001: 'Up Arrow',
  61008: 'Down Arrow',
  61009: 'Right Arrow',

  // Extended keys
  3613: 'Right Ctrl',
  3640: 'Right Alt',
  3655: 'Home',
  3663: 'End',
  3637: 'Delete',
  3649: 'Insert',
  61007: 'Page Up',
  61011: 'Page Down',

  // Windows/Command keys
  3675: 'Left Windows',
  3676: 'Right Windows',

  // Punctuation and symbols
  12: 'Minus',
  13: 'Equals',
  26: 'Left Bracket',
  27: 'Right Bracket',
  39: 'Semicolon',
  40: 'Apostrophe',
  41: 'Grave',
  43: 'Backslash',
  51: 'Comma',
  52: 'Period',
  53: 'Slash',

  // Numpad
  55: 'Numpad *',
  69: 'Num Lock',
  70: 'Scroll Lock',
  71: 'Numpad 7',
  72: 'Numpad 8',
  73: 'Numpad 9',
  74: 'Numpad -',
  75: 'Numpad 4',
  76: 'Numpad 5',
  77: 'Numpad 6',
  78: 'Numpad +',
  79: 'Numpad 1',
  80: 'Numpad 2',
  81: 'Numpad 3',
  82: 'Numpad 0',
  83: 'Numpad .',
};

/**
 * Converts a key code to a human-readable name
 * @param keyCode - The numeric key code
 * @returns The human-readable key name
 */
export function getKeyName(keyCode: number): string {
  return keyCodeToName[keyCode] || `Key ${keyCode}`;
}

/**
 * Processes bot detection details and replaces key codes with key names
 * @param details - Array of bot detection reason strings
 * @returns Array with key codes replaced by key names
 */
export function processKeyCodesInReasons(details: string[]): string[] {
  if (!details || details.length === 0) return [];

  return details.map(reason => {
    // Replace patterns like "Key 12345" with the actual key name
    return reason.replace(/Key (\d+)/g, (match, keyCode) => {
      const code = parseInt(keyCode, 10);
      const keyName = keyCodeToName[code];
      return keyName ? keyName : match; // Keep "Key 12345" if not found
    });
  });
}
