export interface PasswordOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean;
  uniqueOnly: boolean;          // 新增：不重複字元
  firstCharRule: 'any' | 'letter' | 'upper'; // 新增：首字規則
}

export interface PasswordRulesMatch {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSymbols: boolean;
  hasNoAmbiguous: boolean;
  hasNoDuplicate: boolean;      // 新增：無重複字元
  isFirstLetter: boolean;       // 新增：首字為字母
  isFirstUpper: boolean;        // 新增：首字為大寫字母
  length: number;
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
}

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
const AMBIGUOUS = ["i", "l", "1", "I", "o", "0", "O", "L"];

// 加密安全的隨機數選擇
function getRandomChar(chars: string): string {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return chars[array[0] % chars.length];
}

// 陣列亂序 (Fisher-Yates Shuffle)
function shuffleArray(array: string[]): string[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const rArray = new Uint32Array(1);
    window.crypto.getRandomValues(rArray);
    const j = rArray[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getCharType(char: string, u: string, l: string, n: string, s: string): string {
  if (u.includes(char)) return 'upper';
  if (l.includes(char)) return 'lower';
  if (n.includes(char)) return 'number';
  if (s.includes(char)) return 'symbol';
  return 'unknown';
}

export function generatePassword(options: PasswordOptions): string {
  if (options.length < 4) return "";

  let u = UPPERCASE;
  let l = LOWERCASE;
  let n = NUMBERS;
  let s = SYMBOLS;

  if (options.excludeAmbiguous) {
    u = u.split("").filter(c => !AMBIGUOUS.includes(c)).join("");
    l = l.split("").filter(c => !AMBIGUOUS.includes(c)).join("");
    n = n.split("").filter(c => !AMBIGUOUS.includes(c)).join("");
  }

  // 收集可選的字元池
  const activePools: { name: string; chars: string }[] = [];
  if (options.useUppercase && u.length > 0) activePools.push({ name: 'upper', chars: u });
  if (options.useLowercase && l.length > 0) activePools.push({ name: 'lower', chars: l });
  if (options.useNumbers && n.length > 0) activePools.push({ name: 'number', chars: n });
  if (options.useSymbols && s.length > 0) activePools.push({ name: 'symbol', chars: s });

  if (activePools.length === 0) return "";

  const allActiveChars = activePools.map(p => p.chars).join("");

  // 確定首字池
  let firstPool = "";
  if (options.firstCharRule === "upper") {
    firstPool = u; // 必須是大寫字母
  } else if (options.firstCharRule === "letter") {
    firstPool = u + l; // 必須是字母
  }
  
  // 如果指定的首字池在過濾後沒有字元（例如選了首字大寫但沒啟用大寫字母），回退到所有可用字元
  if (!firstPool) {
    firstPool = allActiveChars;
  }

  // 限制不重複字元的處理
  let maxLength = options.length;
  if (options.uniqueOnly && maxLength > allActiveChars.length) {
    maxLength = allActiveChars.length;
  }

  // 抽取首字
  const firstChar = getRandomChar(firstPool);
  
  // 剩餘需要的字元長度
  const remainingLength = maxLength - 1;
  if (remainingLength <= 0) return firstChar;

  // 確定剩餘字元中，哪些類型是「必須且尚未被首字滿足」的
  const firstCharType = getCharType(firstChar, u, l, n, s);
  
  const mandatoryPools: string[] = [];
  for (const pool of activePools) {
    if (pool.name !== firstCharType) {
      mandatoryPools.push(pool.chars);
    }
  }

  // 如果剩餘空間不足以容納所有強制類型，做退化裁剪
  while (mandatoryPools.length > remainingLength) {
    mandatoryPools.pop();
  }

  // 開始填充剩餘字元
  const resultChars: string[] = [];
  const usedChars = new Set<string>();
  if (options.uniqueOnly) {
    usedChars.add(firstChar);
  }

  // 先填充強制類型字元各一個
  for (const mandatoryChars of mandatoryPools) {
    let available = mandatoryChars;
    if (options.uniqueOnly) {
      available = available.split("").filter(c => !usedChars.has(c)).join("");
    }
    if (available.length > 0) {
      const char = getRandomChar(available);
      resultChars.push(char);
      if (options.uniqueOnly) {
        usedChars.add(char);
      }
    }
  }

  // 填充其餘長度
  while (resultChars.length < remainingLength) {
    let available = allActiveChars;
    if (options.uniqueOnly) {
      available = available.split("").filter(c => !usedChars.has(c)).join("");
    }
    if (available.length === 0) break; // 無剩餘可用字元

    const char = getRandomChar(available);
    resultChars.push(char);
    if (options.uniqueOnly) {
      usedChars.add(char);
    }
  }

  // 打亂除首字外的剩餘字元
  const shuffledRemaining = shuffleArray(resultChars);

  return firstChar + shuffledRemaining.join("");
}

export function checkPasswordRules(password: string): PasswordRulesMatch {
  const len = password.length;
  if (!password) {
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
      strength: 'weak'
    };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(password);
  
  // 檢測是否沒有任何易混淆字元
  const hasNoAmbiguous = !AMBIGUOUS.some(char => password.includes(char));

  // 檢測是否無重複字元
  const hasNoDuplicate = new Set(password).size === len;

  // 檢測首字
  const firstChar = password[0] || "";
  const isFirstLetter = /[a-zA-Z]/.test(firstChar);
  const isFirstUpper = /[A-Z]/.test(firstChar);

  // 強度分數計算
  let score = 0;
  if (hasUppercase) score++;
  if (hasLowercase) score++;
  if (hasNumbers) score++;
  if (hasSymbols) score++;
  if (hasNoAmbiguous && score > 0) score++;
  if (hasNoDuplicate && len >= 8) score++; // 長度足夠且無重複可加分
  if (isFirstLetter) score++;

  let strength: PasswordRulesMatch['strength'] = 'weak';
  if (len >= 16 && score >= 6) {
    strength = 'very-strong';
  } else if (len >= 12 && score >= 4) {
    strength = 'strong';
  } else if (len >= 8 && score >= 3) {
    strength = 'medium';
  }

  return {
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSymbols,
    hasNoAmbiguous,
    hasNoDuplicate,
    isFirstLetter,
    isFirstUpper,
    length: len,
    strength
  };
}

export function generateRandomOptions(): PasswordOptions {
  const array = new Uint32Array(5);
  window.crypto.getRandomValues(array);
  
  const length = 12 + (array[0] % 17); // 12 到 28 之間的長度
  const useUppercase = (array[1] & 1) === 1;
  const useLowercase = (array[2] & 1) === 1;
  const useNumbers = (array[3] & 1) === 1;
  const useSymbols = (array[0] & 2) === 2;

  // 確保至少啟用一種字元集
  const finalUpper = useUppercase;
  const finalLower = useLowercase || (!useUppercase && !useNumbers && !useSymbols);
  const finalNumbers = useNumbers || (!useUppercase && !useLowercase && !useSymbols);
  const finalSymbols = useSymbols;

  const excludeAmbiguous = (array[2] & 2) === 2;
  const uniqueOnly = (array[3] & 2) === 2;

  // 首字規則隨機擇一
  const ruleVal = array[4] % 3;
  let firstCharRule: PasswordOptions['firstCharRule'] = 'any';
  if (ruleVal === 1) {
    firstCharRule = 'letter';
  } else if (ruleVal === 2) {
    firstCharRule = 'upper';
  }

  return {
    length,
    useUppercase: finalUpper,
    useLowercase: finalLower,
    useNumbers: finalNumbers,
    useSymbols: finalSymbols,
    excludeAmbiguous,
    uniqueOnly,
    firstCharRule
  };
}
