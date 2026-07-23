import { randomInt } from 'node:crypto'

// Unambiguous uppercase alphabet — excludes 0/O/1/I/L (join codes are
// human-entered enrollment tokens, per FR-19).
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const JOIN_CODE_LENGTH = 6

export function generateJoinCode(): string {
  let code = ''
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]
  }
  return code
}
