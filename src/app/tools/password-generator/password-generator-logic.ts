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

function shuffleArray(array: string[], random: RandomSource): string[] {
  const shuffled = [...array];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1, random);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
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

function estimateGenerationEntropy(
  length: number,
  poolSize: number,
  uniqueOnly: boolean,
): number {
  if (!uniqueOnly) return length * Math.log2(poolSize);

  let entropy = 0;
  for (let index = 0; index < length; index += 1) {
    entropy += Math.log2(poolSize - index);
  }
  return entropy;
}

export function generatePassword(
  options: PasswordOptions,
  random: RandomSource = defaultRandomSource(),
): PasswordGenerationResult {
  const validation = validatePasswordOptions(options);
  if (!validation.valid) return { success: false, code: validation.code };

  const { model } = validation;
  const firstChar = getRandomChar(model.firstCharacters, random);
  const firstCharType = getPoolName(firstChar, model);
  const remainingLength = options.length - 1;
  const mandatoryPools = model.activePools.filter(
    (pool) => pool.name !== firstCharType,
  );
  const resultChars: string[] = [];
  const usedChars = new Set<string>(options.uniqueOnly ? [firstChar] : []);

  for (const pool of mandatoryPools) {
    const available = options.uniqueOnly
      ? Array.from(pool.chars)
          .filter((char) => !usedChars.has(char))
          .join("")
      : pool.chars;
    if (available.length === 0) {
      return { success: false, code: "unique-character-unavailable" };
    }
    const char = getRandomChar(available, random);
    resultChars.push(char);
    if (options.uniqueOnly) usedChars.add(char);
  }

  while (resultChars.length < remainingLength) {
    const available = options.uniqueOnly
      ? Array.from(model.allCharacters)
          .filter((char) => !usedChars.has(char))
          .join("")
      : model.allCharacters;
    if (available.length === 0) {
      return { success: false, code: "unique-character-unavailable" };
    }
    const char = getRandomChar(available, random);
    resultChars.push(char);
    if (options.uniqueOnly) usedChars.add(char);
  }

  const entropyBits = estimateGenerationEntropy(
    options.length,
    model.poolSize,
    options.uniqueOnly,
  );
  return {
    success: true,
    password: firstChar + shuffleArray(resultChars, random).join(""),
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
