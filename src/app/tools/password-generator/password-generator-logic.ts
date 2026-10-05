export type FirstCharRule = "any" | "letter" | "upper";

export interface PasswordOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean;
  uniqueOnly: boolean;
  firstCharRule: FirstCharRule;
}

export interface PasswordRulesMatch {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSymbols: boolean;
  hasNoAmbiguous: boolean;
  hasNoDuplicate: boolean;
  isFirstLetter: boolean;
  isFirstUpper: boolean;
  length: number;
}

export type PasswordStrength = "weak" | "medium" | "strong" | "very-strong";

export interface PasswordStrengthEstimate {
  entropyBits: number;
  poolSize: number;
  strength: PasswordStrength;
}

export interface RandomSource {
  getRandomValues(
    array: Uint32Array<ArrayBufferLike>,
  ): Uint32Array<ArrayBufferLike>;
}

type PasswordPoolName = "upper" | "lower" | "number" | "symbol";

interface PasswordPool {
  name: PasswordPoolName;
  chars: string;
}

export interface PasswordPoolModel {
  activePools: readonly PasswordPool[];
  allCharacters: string;
  firstCharacters: string;
  poolSize: number;
  maxUniqueLength: number;
}

export type PasswordErrorCode =
  | "invalid-options"
  | "invalid-length"
  | "no-character-pool"
  | "first-char-unavailable"
  | "unique-length-exceeded"
  | "unique-character-unavailable";

export type PasswordValidationResult =
  | { valid: true; model: PasswordPoolModel }
  | { valid: false; code: PasswordErrorCode };

export type PasswordGenerationResult =
  | {
      success: true;
      password: string;
      effectiveLength: number;
      poolSize: number;
      entropyBits: number;
      strength: PasswordStrength;
    }
  | { success: false; code: PasswordErrorCode };

const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 64;
const UINT32_RANGE = 0x1_0000_0000;
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
const AMBIGUOUS = ["i", "l", "1", "I", "o", "0", "O", "L"];

function defaultRandomSource(): RandomSource {
  if (!globalThis.crypto) {
    throw new Error("Web Crypto API is unavailable");
  }
  return {
    getRandomValues(array) {
      globalThis.crypto.getRandomValues(
        array as unknown as Uint32Array<ArrayBuffer>,
      );
      return array;
    },
  };
}

export function secureRandomInt(
  maxExclusive: number,
  random: RandomSource = defaultRandomSource(),
): number {
  if (
    !Number.isInteger(maxExclusive) ||
    maxExclusive <= 0 ||
    maxExclusive > UINT32_RANGE
  ) {
    throw new RangeError(
      "maxExclusive must be a positive integer no larger than 2^32",
    );
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const array = new Uint32Array(1);
  do {
    random.getRandomValues(array);
  } while ((array[0] ?? 0) >= limit);

  return (array[0] ?? 0) % maxExclusive;
}

function getRandomChar(chars: string, random: RandomSource): string {
  return chars[secureRandomInt(chars.length, random)] ?? "";
}

function getCharacterPool(options: PasswordOptions): {
  upper: string;
  lower: string;
  number: string;
  symbol: string;
} {
  const filterAmbiguous = (chars: string): string =>
    options.excludeAmbiguous
      ? Array.from(chars)
          .filter((char) => !AMBIGUOUS.includes(char))
          .join("")
      : chars;

  return {
    upper: filterAmbiguous(UPPERCASE),
    lower: filterAmbiguous(LOWERCASE),
    number: filterAmbiguous(NUMBERS),
    symbol: SYMBOLS,
  };
}

function isFirstCharRule(value: unknown): value is FirstCharRule {
  return value === "any" || value === "letter" || value === "upper";
}

function hasValidBooleanOptions(options: PasswordOptions): boolean {
  return (
    typeof options.useUppercase === "boolean" &&
    typeof options.useLowercase === "boolean" &&
    typeof options.useNumbers === "boolean" &&
    typeof options.useSymbols === "boolean" &&
    typeof options.excludeAmbiguous === "boolean" &&
    typeof options.uniqueOnly === "boolean"
  );
}

export function validatePasswordOptions(
  options: PasswordOptions,
): PasswordValidationResult {
  if (
    !options ||
    typeof options !== "object" ||
    !hasValidBooleanOptions(options) ||
    !isFirstCharRule(options.firstCharRule)
  ) {
    return { valid: false, code: "invalid-options" };
  }

  if (
    !Number.isInteger(options.length) ||
    options.length < MIN_PASSWORD_LENGTH ||
    options.length > MAX_PASSWORD_LENGTH
  ) {
    return { valid: false, code: "invalid-length" };
  }

  const characters = getCharacterPool(options);
  const activePools: PasswordPool[] = [];
  if (options.useUppercase)
    activePools.push({ name: "upper", chars: characters.upper });
  if (options.useLowercase)
    activePools.push({ name: "lower", chars: characters.lower });
  if (options.useNumbers)
    activePools.push({ name: "number", chars: characters.number });
  if (options.useSymbols)
    activePools.push({ name: "symbol", chars: characters.symbol });

  if (activePools.length === 0) {
    return { valid: false, code: "no-character-pool" };
  }

  const allCharacters = activePools.map((pool) => pool.chars).join("");
  let firstCharacters = allCharacters;
  if (options.firstCharRule === "letter") {
    firstCharacters = activePools
      .filter((pool) => pool.name === "upper" || pool.name === "lower")
      .map((pool) => pool.chars)
      .join("");
  } else if (options.firstCharRule === "upper") {
    firstCharacters =
      activePools.find((pool) => pool.name === "upper")?.chars ?? "";
  }

  if (firstCharacters.length === 0) {
    return { valid: false, code: "first-char-unavailable" };
  }

  if (options.uniqueOnly && options.length > allCharacters.length) {
    return { valid: false, code: "unique-length-exceeded" };
  }

  return {
    valid: true,
    model: {
      activePools,
      allCharacters,
      firstCharacters,
      poolSize: allCharacters.length,
      maxUniqueLength: allCharacters.length,
    },
  };
}

function getPoolName(
  char: string,
  model: PasswordPoolModel,
): PasswordPoolName | undefined {
  return model.activePools.find((pool) => pool.chars.includes(char))?.name;
}

function countSequences(
  size: number,
  length: number,
  uniqueOnly: boolean,
): bigint {
  if (uniqueOnly && size < length) return 0n;
  if (!uniqueOnly) return BigInt(size) ** BigInt(length);
  let count = 1n;
  for (let index = 0; index < length; index += 1) {
    count *= BigInt(size - index);
  }
  return count;
}

// Inclusion–exclusion counts only passwords satisfying every enabled pool.
function estimateGenerationEntropy(
  options: PasswordOptions,
  model: PasswordPoolModel,
): number {
  let count = 0n;
  for (const firstPool of model.activePools) {
    const firstCount = Array.from(firstPool.chars).filter((char) =>
      model.firstCharacters.includes(char),
    ).length;
    if (firstCount === 0) continue;
    const missingPools = model.activePools.filter((pool) => pool !== firstPool);
    let completions = 0n;
    for (let mask = 0; mask < 1 << missingPools.length; mask += 1) {
      let size = model.poolSize - (options.uniqueOnly ? 1 : 0);
      let excluded = 0;
      for (let index = 0; index < missingPools.length; index += 1) {
        if (mask & (1 << index)) {
          size -= missingPools[index]!.chars.length;
          excluded += 1;
        }
      }
      const sequences = countSequences(
        size,
        options.length - 1,
        options.uniqueOnly,
      );
      completions += excluded % 2 === 0 ? sequences : -sequences;
    }
    count += BigInt(firstCount) * completions;
  }
  // All supported password spaces fit safely within Number's finite range.
  return Math.log2(Number(count));
}

function bufferedRandomSource(random: RandomSource): RandomSource {
  const buffer = new Uint32Array(128);
  let offset = buffer.length;
  return {
    getRandomValues(array) {
      for (let index = 0; index < array.length; index += 1) {
        if (offset === buffer.length) {
          random.getRandomValues(buffer);
          offset = 0;
        }
        array[index] = buffer[offset++]!;
      }
      return array;
    },
  };
}

export function generatePassword(
  options: PasswordOptions,
  random: RandomSource = defaultRandomSource(),
): PasswordGenerationResult {
  const validation = validatePasswordOptions(options);
  if (!validation.valid) return { success: false, code: validation.code };

  const { model } = validation;
  const entropyBits = estimateGenerationEntropy(options, model);
  const source = bufferedRandomSource(random);
  let password: string;
  // Drawing uniformly then rejecting missing pools preserves a uniform
  // distribution over valid passwords. Reserving mandatory characters does not.
  for (;;) {
    const firstChar = getRandomChar(model.firstCharacters, source);
    const resultChars = [firstChar];
    const presentPools = new Set([getPoolName(firstChar, model)]);
    const available = options.uniqueOnly
      ? Array.from(model.allCharacters).filter((char) => char !== firstChar)
      : [];
    for (let index = 1; index < options.length; index += 1) {
      let char: string;
      if (options.uniqueOnly) {
        const choice = secureRandomInt(available.length, source);
        char = available[choice]!;
        available[choice] = available[available.length - 1]!;
        available.pop();
      } else {
        char = getRandomChar(model.allCharacters, source);
      }
      resultChars.push(char);
      presentPools.add(getPoolName(char, model));
    }
    if (presentPools.size === model.activePools.length) {
      password = resultChars.join("");
      break;
    }
  }
  return {
    success: true,
    password,
    effectiveLength: options.length,
    poolSize: model.poolSize,
    entropyBits,
    strength: getStrength(entropyBits),
  };
}

function getStrength(entropyBits: number): PasswordStrength {
  if (entropyBits >= 80) return "very-strong";
  if (entropyBits >= 60) return "strong";
  if (entropyBits >= 40) return "medium";
  return "weak";
}

export function estimatePasswordStrength(
  password: string,
): PasswordStrengthEstimate {
  const length = Array.from(password).length;
  if (length === 0) return { entropyBits: 0, poolSize: 0, strength: "weak" };

  const rules = checkPasswordRules(password);
  let poolSize = 0;
  if (rules.hasUppercase) poolSize += UPPERCASE.length;
  if (rules.hasLowercase) poolSize += LOWERCASE.length;
  if (rules.hasNumbers) poolSize += NUMBERS.length;
  if (rules.hasSymbols) poolSize += SYMBOLS.length;
  if (poolSize === 0) poolSize = 1;

  const entropyBits = length * Math.log2(poolSize);
  return { entropyBits, poolSize, strength: getStrength(entropyBits) };
}

export function checkPasswordRules(password: string): PasswordRulesMatch {
  const characters = Array.from(password);
  const length = characters.length;
  if (length === 0) {
    return {
      hasUppercase: false,
      hasLowercase: false,
      hasNumbers: false,
      hasSymbols: false,
      hasNoAmbiguous: true,
      hasNoDuplicate: true,
      isFirstLetter: false,
      isFirstUpper: false,
      length: 0,
    };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(password);
  const hasNoAmbiguous = !AMBIGUOUS.some((char) => password.includes(char));
  const hasNoDuplicate = new Set(characters).size === length;
  const firstChar = characters[0] ?? "";

  return {
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSymbols,
    hasNoAmbiguous,
    hasNoDuplicate,
    isFirstLetter: /[a-zA-Z]/.test(firstChar),
    isFirstUpper: /[A-Z]/.test(firstChar),
    length,
  };
}

export function generateRandomOptions(
  random: RandomSource = defaultRandomSource(),
): PasswordOptions {
  let useUppercase = secureRandomInt(2, random) === 1;
  let useLowercase = secureRandomInt(2, random) === 1;
  let useNumbers = secureRandomInt(2, random) === 1;
  let useSymbols = secureRandomInt(2, random) === 1;

  if (!useUppercase && !useLowercase && !useNumbers && !useSymbols) {
    switch (secureRandomInt(4, random)) {
      case 0:
        useUppercase = true;
        break;
      case 1:
        useLowercase = true;
        break;
      case 2:
        useNumbers = true;
        break;
      case 3:
        useSymbols = true;
        break;
    }
  }

  const availableFirstCharRules: FirstCharRule[] = ["any"];
  if (useUppercase || useLowercase) availableFirstCharRules.push("letter");
  if (useUppercase) availableFirstCharRules.push("upper");
  const firstCharRule =
    availableFirstCharRules[
      secureRandomInt(availableFirstCharRules.length, random)
    ] ?? "any";
  const length = 12 + secureRandomInt(17, random);
  const excludeAmbiguous = secureRandomInt(2, random) === 1;
  const characterPool = getCharacterPool({
    length,
    useUppercase,
    useLowercase,
    useNumbers,
    useSymbols,
    excludeAmbiguous,
    uniqueOnly: false,
    firstCharRule,
  });
  const poolSize =
    (useUppercase ? characterPool.upper.length : 0) +
    (useLowercase ? characterPool.lower.length : 0) +
    (useNumbers ? characterPool.number.length : 0) +
    (useSymbols ? characterPool.symbol.length : 0);

  return {
    length,
    useUppercase,
    useLowercase,
    useNumbers,
    useSymbols,
    excludeAmbiguous,
    uniqueOnly: poolSize >= length && secureRandomInt(2, random) === 1,
    firstCharRule,
  };
}
