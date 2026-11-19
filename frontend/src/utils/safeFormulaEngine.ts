/**
 * HMCPS Safe Formula Engine (Zero-Eval Recursive-Descent AST Parser & Financial Safety Verifier)
 *
 * Tuyệt đối KHÔNG sử dụng eval() hoặc new Function().
 * Đảm bảo:
 * 1. Xác thực cú pháp chặt chẽ bằng bộ phân tích từ vựng (Lexer) & cây cú pháp (Recursive-Descent AST).
 * 2. Whitelist nghiêm ngặt biến, hàm toán học và chuỗi hằng ('SITE_ENGINEER', 'OFFICE_STAFF').
 * 3. Chốt chặn an toàn tài chính: cấm chia cho 0, cấm NaN / Infinity / tràn số / âm quỹ lương trên 4 kịch bản kiểm thử biên.
 */

export interface FormulaExpressions extends Record<string, string> {
  proration: string;
  overtime: string;
  insurance: string;
  taxableIncome: string;
  netSalary: string;
}

export const DEFAULT_SAFE_FORMULAS: FormulaExpressions = {
  proration: '(baseSalary / standardWorkDays) * actualWorkDays',
  overtime: 'hourlyRate = baseSalary / (standardWorkDays * 8);\novertimePay = otHours * hourlyRate * 1.5;',
  insurance:
    "insuranceBase = (empType === 'SITE_ENGINEER') ? Math.min(baseSalary, 46800000) : Math.min(baseSalary + positionAllowance, 46800000);\nbhNld = insuranceBase * 0.105;\nbhDn = insuranceBase * 0.235;",
  taxableIncome:
    'taxableIncome = Math.max(0, gross - exemptAllowances - bhNld - 11000000 - (dependents * 4400000));\npitTax = calculateProgressiveTax(taxableIncome);',
  netSalary: 'netSalary = Math.max(0, gross - bhNld - pitTax - unionDues);',
};

export const ALLOWED_MATH_METHODS = new Set([
  'min',
  'max',
  'round',
  'floor',
  'ceil',
  'abs',
  'pow',
  'sqrt',
  'trunc',
]);

export const ALLOWED_GLOBAL_FUNCTIONS = new Set([
  'calculateProgressiveTax',
  'IF',
  'MIN',
  'MAX',
  'ROUND',
]);

export const ALLOWED_STRING_LITERALS = new Set(['SITE_ENGINEER', 'OFFICE_STAFF']);

export const FORBIDDEN_KEYWORDS = new Set([
  'window',
  'document',
  'globalThis',
  'self',
  'eval',
  'Function',
  'fetch',
  'XMLHttpRequest',
  'alert',
  'confirm',
  'prompt',
  'console',
  'while',
  'for',
  'do',
  'return',
  'import',
  'export',
  'class',
  'new',
  'var',
  'let',
  'const',
  'this',
  'try',
  'catch',
  'throw',
  'if',
  'else',
  'switch',
  'constructor',
  'prototype',
  '__proto__',
]);

export const FORMULA_BLOCK_META: Record<
  keyof FormulaExpressions,
  { title: string; allowedVars: string[]; requiredOutputs?: string[] }
> = {
  proration: {
    title: '1. Lương Thời Gian Proration',
    allowedVars: ['baseSalary', 'standardWorkDays', 'actualWorkDays', 'proratedBase', 'Math'],
    requiredOutputs: ['proratedBase'],
  },
  overtime: {
    title: '2. Tiền Làm Thêm Giờ OT',
    allowedVars: [
      'baseSalary',
      'standardWorkDays',
      'actualWorkDays',
      'otHours',
      'hourlyRate',
      'overtimePay',
      'otMultiplier',
      'Math',
    ],
    requiredOutputs: ['overtimePay'],
  },
  insurance: {
    title: '3. Nền Đóng BHXH & Tỷ Lệ 34%',
    allowedVars: ['empType', 'baseSalary', 'positionAllowance', 'insuranceBase', 'bhNld', 'bhDn', 'Math'],
    requiredOutputs: ['insuranceBase', 'bhNld', 'bhDn'],
  },
  taxableIncome: {
    title: '4. Thuế Thu Nhập Cá Nhân Lũy Tiến',
    allowedVars: [
      'gross',
      'exemptAllowances',
      'bhNld',
      'dependents',
      'taxableIncome',
      'pitTax',
      'calculateProgressiveTax',
      'Math',
    ],
    requiredOutputs: ['taxableIncome'],
  },
  netSalary: {
    title: '5. Thực Nhận Chuyển Khoản (Net)',
    allowedVars: ['gross', 'bhNld', 'pitTax', 'unionDues', 'proratedBase', 'overtimePay', 'netSalary', 'Math'],
    requiredOutputs: ['netSalary'],
  },
};

export const MAX_SAFE_FINANCIAL_VALUE = 10_000_000_000; // 10 tỷ VNĐ/nhân sự/tháng

export function calculateProgressivePitSafe(assessable: number): number {
  if (!Number.isFinite(assessable) || assessable <= 0) return 0;
  if (assessable <= 5_000_000) return assessable * 0.05;
  if (assessable <= 10_000_000) return 250_000 + (assessable - 5_000_000) * 0.1;
  if (assessable <= 18_000_000) return 750_000 + (assessable - 10_000_000) * 0.15;
  if (assessable <= 32_000_000) return 1_950_000 + (assessable - 18_000_000) * 0.2;
  if (assessable <= 52_000_000) return 4_750_000 + (assessable - 32_000_000) * 0.25;
  if (assessable <= 80_000_000) return 9_750_000 + (assessable - 52_000_000) * 0.3;
  return 18_150_000 + (assessable - 80_000_000) * 0.35;
}

type TokenType = 'NUMBER' | 'STRING' | 'IDENT' | 'OP' | 'PUNC' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

type ExprNode =
  | { kind: 'Number'; value: number }
  | { kind: 'String'; value: string }
  | { kind: 'Ident'; name: string }
  | { kind: 'Unary'; op: string; arg: ExprNode }
  | { kind: 'Binary'; op: string; left: ExprNode; right: ExprNode }
  | { kind: 'Ternary'; cond: ExprNode; whenTrue: ExprNode; whenFalse: ExprNode }
  | { kind: 'Call'; callee: string; method?: string; args: ExprNode[] };

type StmtNode =
  | { kind: 'Assign'; target: string; expr: ExprNode }
  | { kind: 'Expr'; expr: ExprNode };

class FormulaEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaEngineError';
  }
}

function tokenize(source: string): Token[] {
  const cleaned = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
  const tokens: Token[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // String literal
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i;
      i++;
      let val = '';
      while (i < cleaned.length && cleaned[i] !== quote) {
        if (cleaned[i] === '\\' && i + 1 < cleaned.length) {
          i++;
        }
        val += cleaned[i];
        i++;
      }
      if (i >= cleaned.length) {
        throw new FormulaEngineError('Thiếu dấu nháy đóng chuỗi ký tự!');
      }
      i++; // consume closing quote
      if (!ALLOWED_STRING_LITERALS.has(val)) {
        throw new FormulaEngineError(
          `Chuỗi ký tự '${val}' không hợp lệ! Chỉ cho phép hằng chuỗi 'SITE_ENGINEER' hoặc 'OFFICE_STAFF'.`
        );
      }
      tokens.push({ type: 'STRING', value: val, pos: start });
      continue;
    }

    // Number literal
    if (/[0-9]/.test(ch)) {
      const start = i;
      let dotCount = 0;
      while (i < cleaned.length && (/[0-9]/.test(cleaned[i]) || cleaned[i] === '.')) {
        if (cleaned[i] === '.') dotCount++;
        i++;
      }
      const rawNum = cleaned.slice(start, i);
      if (dotCount > 1 || rawNum.endsWith('.')) {
        throw new FormulaEngineError(`Số thập phân '${rawNum}' sai định dạng tại vị trí ${start + 1}!`);
      }
      if (i < cleaned.length && /[A-Za-z_$]/.test(cleaned[i])) {
        throw new FormulaEngineError(`Ký tự không hợp lệ ngay sau số '${rawNum}' tại vị trí ${i + 1}!`);
      }
      tokens.push({ type: 'NUMBER', value: rawNum, pos: start });
      continue;
    }

    // Identifier
    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      while (i < cleaned.length && /[A-Za-z0-9_$]/.test(cleaned[i])) {
        i++;
      }
      const ident = cleaned.slice(start, i);
      if (FORBIDDEN_KEYWORDS.has(ident)) {
        throw new FormulaEngineError(
          `Từ khóa bị cấm '${ident}'! Hệ thống chỉ chấp nhận biểu thức toán học an toàn (không chứa mã JS điều khiển).`
        );
      }
      tokens.push({ type: 'IDENT', value: ident, pos: start });
      continue;
    }

    // 3-char operators
    const three = cleaned.slice(i, i + 3);
    if (three === '===' || three === '!==') {
      tokens.push({ type: 'OP', value: three, pos: i });
      i += 3;
      continue;
    }

    // 2-char operators
    const two = cleaned.slice(i, i + 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'OP', value: two, pos: i });
      i += 2;
      continue;
    }

    // 1-char operators
    if ('+-*/=<>!'.includes(ch)) {
      tokens.push({ type: 'OP', value: ch, pos: i });
      i++;
      continue;
    }

    // Punctuation
    if ('(),?:;.'.includes(ch)) {
      tokens.push({ type: 'PUNC', value: ch, pos: i });
      i++;
      continue;
    }

    throw new FormulaEngineError(`Ký tự không được hỗ trợ '${ch}' tại vị trí ${i + 1}!`);
  }

  tokens.push({ type: 'EOF', value: '', pos: cleaned.length });
  return tokens;
}

class RecursiveDescentParser {
  private tokens: Token[];
  private cursor = 0;
  private allowedVars: Set<string>;

  constructor(tokens: Token[], allowedVars: Set<string>) {
    this.tokens = tokens;
    this.allowedVars = allowedVars;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.cursor + offset, this.tokens.length - 1)];
  }

  private next(): Token {
    const t = this.peek();
    if (this.cursor < this.tokens.length - 1) this.cursor++;
    return t;
  }

  private match(type: TokenType, value?: string): boolean {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    this.next();
    return true;
  }

  public parseProgram(): StmtNode[] {
    const stmts: StmtNode[] = [];
    while (this.peek().type !== 'EOF') {
      if (this.match('PUNC', ';')) continue;
      stmts.push(this.parseStatement());
      if (this.peek().type !== 'EOF' && !this.match('PUNC', ';')) {
        throw new FormulaEngineError(
          `Thiếu dấu chấm phẩy ';' hoặc toán tử trước '${this.peek().value}' tại vị trí ${this.peek().pos + 1}!`
        );
      }
    }
    if (stmts.length === 0) {
      throw new FormulaEngineError('Biểu thức công thức đang trống!');
    }
    return stmts;
  }

  private parseStatement(): StmtNode {
    if (this.peek().type === 'IDENT' && this.peek(1).type === 'OP' && this.peek(1).value === '=') {
      const target = this.next().value;
      if (!this.allowedVars.has(target) || target === 'Math') {
        throw new FormulaEngineError(
          `Biến đích '${target}' không nằm trong danh sách biến được phép gán (${Array.from(this.allowedVars)
            .filter((v) => v !== 'Math')
            .join(', ')})!`
        );
      }
      this.next(); // consume '='
      const expr = this.parseExpression();
      return { kind: 'Assign', target, expr };
    }
    return { kind: 'Expr', expr: this.parseExpression() };
  }

  private parseExpression(): ExprNode {
    return this.parseTernary();
  }

  private parseTernary(): ExprNode {
    const cond = this.parseLogicalOr();
    if (this.match('PUNC', '?')) {
      const whenTrue = this.parseExpression();
      if (!this.match('PUNC', ':')) {
        throw new FormulaEngineError("Biểu thức điều kiện '? :' thiếu dấu hai chấm ':'!");
      }
      const whenFalse = this.parseExpression();
      return { kind: 'Ternary', cond, whenTrue, whenFalse };
    }
    return cond;
  }

  private parseLogicalOr(): ExprNode {
    let left = this.parseLogicalAnd();
    while (this.peek().type === 'OP' && this.peek().value === '||') {
      const op = this.next().value;
      const right = this.parseLogicalAnd();
      left = { kind: 'Binary', op, left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ExprNode {
    let left = this.parseEquality();
    while (this.peek().type === 'OP' && this.peek().value === '&&') {
      const op = this.next().value;
      const right = this.parseEquality();
      left = { kind: 'Binary', op, left, right };
    }
    return left;
  }

  private parseEquality(): ExprNode {
    let left = this.parseRelational();
    while (this.peek().type === 'OP' && ['===', '!==', '==', '!='].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseRelational();
      left = { kind: 'Binary', op, left, right };
    }
    return left;
  }

  private parseRelational(): ExprNode {
    let left = this.parseAdditive();
    while (this.peek().type === 'OP' && ['<', '<=', '>', '>='].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseAdditive();
      left = { kind: 'Binary', op, left, right };
    }
    return left;
  }

  private parseAdditive(): ExprNode {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      left = { kind: 'Binary', op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): ExprNode {
    let left = this.parseUnary();
    while (this.peek().type === 'OP' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.next().value;
      const right = this.parseUnary();
      left = { kind: 'Binary', op, left, right };
    }
    return left;
  }

  private parseUnary(): ExprNode {
    if (this.peek().type === 'OP' && ['+', '-', '!'].includes(this.peek().value)) {
      const op = this.next().value;
      return { kind: 'Unary', op, arg: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    const t = this.peek();

    if (t.type === 'NUMBER') {
      this.next();
      const num = Number(t.value);
      if (!Number.isFinite(num)) {
        throw new FormulaEngineError(`Giá trị số không hợp lệ '${t.value}'!`);
      }
      return { kind: 'Number', value: num };
    }

    if (t.type === 'STRING') {
      this.next();
      return { kind: 'String', value: t.value };
    }

    if (this.match('PUNC', '(')) {
      const expr = this.parseExpression();
      if (!this.match('PUNC', ')')) {
        throw new FormulaEngineError("Lỗi cặp dấu ngoặc: Thiếu dấu đóng ngoặc ')'!");
      }
      return expr;
    }

    if (t.type === 'IDENT') {
      const name = this.next().value;

      // Property access: ONLY Math.<method>(...)
      if (this.match('PUNC', '.')) {
        const propTok = this.peek();
        if (propTok.type !== 'IDENT') {
          throw new FormulaEngineError(`Cú pháp dấu chấm '.' không hợp lệ sau '${name}'!`);
        }
        const method = this.next().value;
        if (name !== 'Math' || !ALLOWED_MATH_METHODS.has(method)) {
          throw new FormulaEngineError(
            `Thuộc tính / hàm '${name}.${method}' không được phép! Chỉ hỗ trợ Math.min/max/round/floor/ceil/abs/trunc.`
          );
        }
        if (!this.match('PUNC', '(')) {
          throw new FormulaEngineError(`Hàm 'Math.${method}' cần cặp ngoặc tham số '(...)'!`);
        }
        const args = this.parseArgList();
        if (args.length === 0) {
          throw new FormulaEngineError(`Hàm 'Math.${method}()' cần tối thiểu 01 tham số!`);
        }
        return { kind: 'Call', callee: 'Math', method, args };
      }

      // Function call: IF(...), MIN(...), MAX(...), ROUND(...), calculateProgressiveTax(...)
      if (this.match('PUNC', '(')) {
        if (!ALLOWED_GLOBAL_FUNCTIONS.has(name)) {
          throw new FormulaEngineError(`Hàm '${name}()' không được hỗ trợ trong bộ công thức an toàn!`);
        }
        const args = this.parseArgList();
        if (name === 'IF' && args.length !== 3) {
          throw new FormulaEngineError('Hàm IF(điều_kiện, giá_trị_đúng, giá_trị_sai) yêu cầu đúng 3 tham số!');
        }
        if (name === 'calculateProgressiveTax' && args.length !== 1) {
          throw new FormulaEngineError('Hàm calculateProgressiveTax(taxableIncome) yêu cầu đúng 1 tham số!');
        }
        return { kind: 'Call', callee: name, args };
      }

      // Variable lookup
      if (name === 'Math') {
        throw new FormulaEngineError("Không thể sử dụng 'Math' độc lập — hãy gọi VD: Math.min(...), Math.max(...)!");
      }
      if (!this.allowedVars.has(name)) {
        const validList = Array.from(this.allowedVars)
          .filter((v) => v !== 'Math')
          .join(', ');
        throw new FormulaEngineError(`Biến không tồn tại hoặc văn bản thừa '${name}'! Các biến hợp lệ: ${validList}.`);
      }
      return { kind: 'Ident', name };
    }

    throw new FormulaEngineError(
      t.type === 'EOF'
        ? 'Biểu thức bị kết thúc đột ngột (thiếu toán hạng)!'
        : `Token không hợp lệ '${t.value}' tại vị trí ${t.pos + 1}!`
    );
  }

  private parseArgList(): ExprNode[] {
    const args: ExprNode[] = [];
    if (this.match('PUNC', ')')) return args;
    while (true) {
      args.push(this.parseExpression());
      if (this.match('PUNC', ',')) continue;
      if (this.match('PUNC', ')')) break;
      throw new FormulaEngineError("Thiếu dấu phẩy ',' hoặc dấu đóng ngoặc ')' trong danh sách tham số hàm!");
    }
    return args;
  }
}

type RuntimeVal = number | string | boolean;

function toNum(v: RuntimeVal, context: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new FormulaEngineError(`Giá trị không phải số hợp lệ (${String(v)}) tại ${context}!`);
  }
  return v;
}

function evalExpr(
  node: ExprNode,
  env: Record<string, RuntimeVal>,
  onTaxComputed?: (tax: number) => void
): RuntimeVal {
  switch (node.kind) {
    case 'Number':
      return node.value;
    case 'String':
      return node.value;
    case 'Ident': {
      const val = env[node.name];
      if (val === undefined) {
        throw new FormulaEngineError(`Biến '${node.name}' chưa được khởi tạo giá trị!`);
      }
      return val;
    }
    case 'Unary': {
      const arg = evalExpr(node.arg, env, onTaxComputed);
      if (node.op === '!') return !arg;
      const n = toNum(arg, `toán tử '${node.op}'`);
      return node.op === '-' ? -n : n;
    }
    case 'Ternary': {
      const cond = evalExpr(node.cond, env, onTaxComputed);
      return cond ? evalExpr(node.whenTrue, env, onTaxComputed) : evalExpr(node.whenFalse, env, onTaxComputed);
    }
    case 'Binary': {
      if (node.op === '&&') {
        const l = evalExpr(node.left, env, onTaxComputed);
        return l ? evalExpr(node.right, env, onTaxComputed) : false;
      }
      if (node.op === '||') {
        const l = evalExpr(node.left, env, onTaxComputed);
        return l ? l : evalExpr(node.right, env, onTaxComputed);
      }
      const l = evalExpr(node.left, env, onTaxComputed);
      const r = evalExpr(node.right, env, onTaxComputed);
      switch (node.op) {
        case '===':
          return l === r;
        case '!==':
          return l !== r;
        case '==':
          return l == r;
        case '!=':
          return l != r;
        case '<':
          return toNum(l, '<') < toNum(r, '<');
        case '<=':
          return toNum(l, '<=') <= toNum(r, '<=');
        case '>':
          return toNum(l, '>') > toNum(r, '>');
        case '>=':
          return toNum(l, '>=') >= toNum(r, '>=');
        case '+': {
          const res = toNum(l, '+') + toNum(r, '+');
          if (!Number.isFinite(res) || Math.abs(res) > MAX_SAFE_FINANCIAL_VALUE) {
            throw new FormulaEngineError('Tràn giới hạn an toàn tài chính ở phép cộng (+)!');
          }
          return res;
        }
        case '-': {
          const res = toNum(l, '-') - toNum(r, '-');
          if (!Number.isFinite(res) || Math.abs(res) > MAX_SAFE_FINANCIAL_VALUE) {
            throw new FormulaEngineError('Tràn giới hạn an toàn tài chính ở phép trừ (-)!');
          }
          return res;
        }
        case '*': {
          const res = toNum(l, '*') * toNum(r, '*');
          if (!Number.isFinite(res) || Math.abs(res) > MAX_SAFE_FINANCIAL_VALUE) {
            throw new FormulaEngineError('Tràn giới hạn an toàn tài chính ở phép nhân (*)!');
          }
          return res;
        }
        case '/': {
          const denom = toNum(r, '/');
          if (Math.abs(denom) < 1e-12) {
            throw new FormulaEngineError(
              'Lỗi an toàn tài chính: Phát hiện phép chia cho 0 (mẫu số = 0)! Vui lòng bảo vệ mẫu số (VD: Math.max(1, standardWorkDays)).'
            );
          }
          const res = toNum(l, '/') / denom;
          if (!Number.isFinite(res) || Math.abs(res) > MAX_SAFE_FINANCIAL_VALUE) {
            throw new FormulaEngineError('Kết quả phép chia không hữu hạn hoặc vượt ngưỡng tài chính!');
          }
          return res;
        }
        default:
          throw new FormulaEngineError(`Toán tử không được hỗ trợ '${node.op}'!`);
      }
    }
    case 'Call': {
      if (node.callee === 'IF') {
        const cond = evalExpr(node.args[0], env, onTaxComputed);
        return cond ? evalExpr(node.args[1], env, onTaxComputed) : evalExpr(node.args[2], env, onTaxComputed);
      }
      const argNums = node.args.map((a) => toNum(evalExpr(a, env, onTaxComputed), node.callee));
      if (node.callee === 'calculateProgressiveTax') {
        const tax = calculateProgressivePitSafe(argNums[0]);
        onTaxComputed?.(tax);
        return tax;
      }
      if (node.callee === 'MIN') return Math.min(...argNums);
      if (node.callee === 'MAX') return Math.max(...argNums);
      if (node.callee === 'ROUND') return Math.round(argNums[0]);
      if (node.callee === 'Math' && node.method) {
        let out: number;
        switch (node.method) {
          case 'min':
            out = Math.min(...argNums);
            break;
          case 'max':
            out = Math.max(...argNums);
            break;
          case 'round':
            out = Math.round(argNums[0]);
            break;
          case 'floor':
            out = Math.floor(argNums[0]);
            break;
          case 'ceil':
            out = Math.ceil(argNums[0]);
            break;
          case 'abs':
            out = Math.abs(argNums[0]);
            break;
          case 'trunc':
            out = Math.trunc(argNums[0]);
            break;
          case 'sqrt':
            if (argNums[0] < 0) throw new FormulaEngineError('Không thể lấy căn bậc hai của số âm!');
            out = Math.sqrt(argNums[0]);
            break;
          case 'pow':
            out = Math.pow(argNums[0], argNums[1] ?? 1);
            break;
          default:
            throw new FormulaEngineError(`Hàm Math.${node.method} không được hỗ trợ!`);
        }
        if (!Number.isFinite(out)) {
          throw new FormulaEngineError(`Hàm Math.${node.method} trả về giá trị không hợp lệ (${out})!`);
        }
        return out;
      }
      throw new FormulaEngineError(`Lời gọi hàm '${node.callee}' không hợp lệ!`);
    }
  }
}

export interface SafeEvaluationOutput {
  env: Record<string, RuntimeVal>;
  lastValue: RuntimeVal | null;
  computedTax: number | null;
}

export function evaluateFormulaBlockSafe(
  key: keyof FormulaExpressions,
  rawExpr: string,
  initialEnv: Record<string, RuntimeVal>
): SafeEvaluationOutput {
  const meta = FORMULA_BLOCK_META[key];
  const tokens = tokenize(rawExpr);
  const parser = new RecursiveDescentParser(tokens, new Set(meta.allowedVars));
  const stmts = parser.parseProgram();

  const env: Record<string, RuntimeVal> = { ...initialEnv };
  let lastValue: RuntimeVal | null = null;
  let computedTax: number | null = null;

  for (const stmt of stmts) {
    if (stmt.kind === 'Assign') {
      const val = evalExpr(stmt.expr, env, (t) => {
        computedTax = t;
      });
      env[stmt.target] = val;
      lastValue = val;
    } else {
      lastValue = evalExpr(stmt.expr, env, (t) => {
        computedTax = t;
      });
    }
  }

  return { env, lastValue, computedTax };
}

export interface StressTestScenario {
  label: string;
  env: Record<string, RuntimeVal>;
}

const FINANCIAL_STRESS_SCENARIOS: StressTestScenario[] = [
  {
    label: 'Kỹ sư CT chuẩn (22,5 công)',
    env: {
      baseSalary: 18_000_000,
      standardWorkDays: 22.5,
      actualWorkDays: 21.5,
      otHours: 8,
      empType: 'SITE_ENGINEER',
      positionAllowance: 0,
      gross: 22_500_000,
      exemptAllowances: 4_500_000,
      dependents: 1,
      unionDues: 180_000,
      proratedBase: 17_200_000,
      hourlyRate: 100_000,
      overtimePay: 1_200_000,
      otMultiplier: 1.5,
      insuranceBase: 18_000_000,
      bhNld: 1_890_000,
      bhDn: 4_230_000,
      taxableIncome: 710_000,
      pitTax: 35_500,
      netSalary: 20_394_500,
    },
  },
  {
    label: 'NV Văn phòng chuẩn (22,5 công)',
    env: {
      baseSalary: 22_000_000,
      standardWorkDays: 22.5,
      actualWorkDays: 18,
      otHours: 4,
      empType: 'OFFICE_STAFF',
      positionAllowance: 1_500_000,
      gross: 23_400_000,
      exemptAllowances: 730_000,
      dependents: 0,
      unionDues: 220_000,
      proratedBase: 17_600_000,
      hourlyRate: 122_222,
      overtimePay: 733_333,
      otMultiplier: 1.5,
      insuranceBase: 23_500_000,
      bhNld: 2_467_500,
      bhDn: 5_522_500,
      taxableIncome: 9_202_500,
      pitTax: 670_250,
      netSalary: 20_042_250,
    },
  },
  {
    label: 'Biên 0 ngày công (không âm / không NaN)',
    env: {
      baseSalary: 18_000_000,
      standardWorkDays: 22.5,
      actualWorkDays: 0,
      otHours: 0,
      empType: 'OFFICE_STAFF',
      positionAllowance: 0,
      gross: 0,
      exemptAllowances: 0,
      dependents: 0,
      unionDues: 0,
      proratedBase: 0,
      hourlyRate: 100_000,
      overtimePay: 0,
      otMultiplier: 1.5,
      insuranceBase: 0,
      bhNld: 0,
      bhDn: 0,
      taxableIncome: 0,
      pitTax: 0,
      netSalary: 0,
    },
  },
  {
    label: 'Lương cao vượt trần BHXH 46,8tr',
    env: {
      baseSalary: 60_000_000,
      standardWorkDays: 22.5,
      actualWorkDays: 22.5,
      otHours: 4,
      empType: 'OFFICE_STAFF',
      positionAllowance: 5_000_000,
      gross: 67_000_000,
      exemptAllowances: 730_000,
      dependents: 2,
      unionDues: 234_000,
      proratedBase: 60_000_000,
      hourlyRate: 333_333,
      overtimePay: 2_000_000,
      otMultiplier: 1.5,
      insuranceBase: 46_800_000,
      bhNld: 4_914_000,
      bhDn: 10_998_000,
      taxableIncome: 41_556_000,
      pitTax: 7_139_000,
      netSalary: 54_713_000,
    },
  },
];

export function validateFormulaBlockSafe(key: keyof FormulaExpressions, rawExpr: string): string | null {
  const meta = FORMULA_BLOCK_META[key];
  const expr = (rawExpr || '').trim();
  if (!expr) {
    return `Biểu thức không được để trống tại khối [${meta.title}]!`;
  }

  try {
    const tokens = tokenize(expr);
    const parser = new RecursiveDescentParser(tokens, new Set(meta.allowedVars));
    const stmts = parser.parseProgram();

    // Check statements discipline: multi-statement blocks must assign or invoke calculateProgressiveTax
    if (stmts.length > 1) {
      for (const s of stmts) {
        const isTaxExpr =
          s.kind === 'Expr' && s.expr.kind === 'Call' && s.expr.callee === 'calculateProgressiveTax';
        if (s.kind !== 'Assign' && !isTaxExpr) {
          return `Phát hiện câu lệnh không gán biến hoặc dư thừa tại khối [${meta.title}]! Mỗi dòng lệnh phải là phép gán hoặc lời gọi hàm hợp lệ.`;
        }
      }
    } else if ((key === 'overtime' || key === 'insurance') && stmts[0].kind !== 'Assign') {
      return `Khối [${meta.title}] cần gán kết quả cho biến chuẩn (VD: ${
        key === 'overtime' ? 'overtimePay = ...' : 'insuranceBase = ...; bhNld = ...; bhDn = ...'
      }).`;
    }

    // Run 4 financial safety stress scenarios (Zero-Eval)
    for (const scenario of FINANCIAL_STRESS_SCENARIOS) {
      const result = evaluateFormulaBlockSafe(key, expr, scenario.env);
      const checkedKeys = meta.requiredOutputs || [];

      // If single expression block (proration / netSalary without explicit assignment), check lastValue
      if (stmts.length === 1 && stmts[0].kind === 'Expr') {
        if (typeof result.lastValue !== 'number' || !Number.isFinite(result.lastValue)) {
          return `Kết quả biểu thức tại khối [${meta.title}] không phải số tài chính hợp lệ trong kịch bản [${scenario.label}]!`;
        }
        if (result.lastValue < -0.001) {
          return `Vi phạm an toàn tài chính tại khối [${meta.title}]: Kết quả bị âm (${Math.round(result.lastValue).toLocaleString('vi-VN')} đ) trong kịch bản [${scenario.label}]!`;
        }
      }

      for (const outKey of checkedKeys) {
        const v = result.env[outKey];
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          return `Biến '${outKey}' tại khối [${meta.title}] sinh giá trị không hợp lệ (${String(v)}) trong kịch bản [${scenario.label}]!`;
        }
        if (v < -0.001) {
          return `Vi phạm an toàn tài chính tại khối [${meta.title}]: Biến '${outKey}' bị âm (${Math.round(v).toLocaleString('vi-VN')} đ) trong kịch bản [${scenario.label}]!`;
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Biểu thức không hợp lệ';
    return `Lỗi cú pháp / An toàn tài chính tại khối [${meta.title}]: ${msg}`;
  }

  return null;
}

/**
 * Zero-eval single expression evaluator dùng bởi payrollCalculator.ts cho custom approved formulas.
 */
export function evaluateSafeSingleExpression(
  expression: string | undefined,
  vars: Record<string, number>,
  fallbackValue: number
): number {
  if (!expression || !expression.trim()) return fallbackValue;
  try {
    const tokens = tokenize(expression);
    const allowed = new Set([...Object.keys(vars), 'Math']);
    const parser = new RecursiveDescentParser(tokens, allowed);
    const stmts = parser.parseProgram();
    const env: Record<string, RuntimeVal> = { ...vars };
    let last: RuntimeVal | null = null;
    for (const stmt of stmts) {
      if (stmt.kind === 'Assign') {
        last = evalExpr(stmt.expr, env);
        env[stmt.target] = last;
      } else {
        last = evalExpr(stmt.expr, env);
      }
    }
    if (typeof last !== 'number' || !Number.isFinite(last) || last < 0) {
      return fallbackValue;
    }
    return Math.round(last);
  } catch {
    return fallbackValue;
  }
}
