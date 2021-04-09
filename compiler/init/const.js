
var SubComponentType = {

    OPEN: "subcomponent.open",

    GROUP: "subcomponent.group",
    ROOT: "subcomponent.group.root",
    SUBCONTEXT: "subcomponent.group.subcontext",
    SUBTYPE: "subcomponent.group.subtype",
    GROUP_BRACKET: "subcomponent.group.bracket",
    GROUP_CURLY: "subcomponent.group.curly",
    GROUP_PARENTHESES: "subcomponent.group.parentheses",

    STRING: "subcomponent.string",
    STRING_SINGLE: "subcomponent.string.single",
    STRING_DOUBLE: "subcomponent.string.double",
    
    NAME: "subcomponent.name",
    NUMBER: "subcomponent.number",
    FLAG: "subcomponent.flag",
    COMMAND: "subcomponent.command",

    COMMENT: "subcomponent.comment",
    COMMENT_LINE: "subcomponent.comment.line",
    COMMENT_BLOCK: "subcomponent.comment.block",

    LINEBREAK: "subcomponent.linebreak",
    SPECIALCHAR: "subcomponent.specialchar",

    SYMBOL: "subcomponent.symbol",

    TYPE_ANY: "subcomponent.name.any"


};

/** Continuation of SubComponentType (but for Symbols) */
var SymbolType = {
    PLUS2: "subcomponent.symbol.plusplus",
    MINUS2: "subcomponent.symbol.minusminus",
    ASTERISK2: "subcomponent.symbol.doubleaskterisk",
    
    COMMENT: "subcomponent.symbol.comment",
    COMMENT_LINE: "subcomponent.symbol.comment.line",
    COMMENT_BLOCK: "subcomponent.symbol.comment.block",

    COLON2: "subcomponent.symbol.coloncolon",
    GREATERTHAN2: "subcomponent.symbol.doublegreaterthan",

    GREATOREQUAL: "subcomponent.symbol.greatorequal",
    LESSOREQUAL: "subcomponent.symbol.lessorequal",
    NOTEQUAL: "subcomponent.symbol.notequal",
    AND2: "subcomponent.symbol.doubleand",
    OR2: "subcomponent.symbol.doubleor",
};


var CharType = {
    ALPHA: "chartype.alpha",
    NUM: "chartype.num",
    DOT: "chartype.dot",
    COMMA: "chartype.comma",
    COLON: "chartype.colon",
    QUESTION: "chartype.questionmark",

    STRING: "chartype.string",
    STRING_SINGLE: "chartype.string.single",
    STRING_DOUBLE: "chartype.string.double",

    GROUP: "chartype.group",
    GROUP_PARENTHESES: "chartype.group.parentheses", 
    GROUP_BRACKET: "chartype.group.bracket", 
    GROUP_CURLY: "chartype.group.curly", 


    COMPARATOR: "chartype.comparator",
    EQUAL: "chartype.comparator.equal",
    LESSTHAN: "chartype.comparator.lessthan",
    GREATERTHAN: "chartype.comparator.greaterthan",


    OPERATOR: "chartype.operator",
    PLUS: "chartype.operator.plus",
    MINUS: "chartype.operator.minus",
    ASTERISK: "chartype.operator.asterisk",
    SLASH: "chartype.operator.slash",
    PERCENT: "chartype.operator.percent",

    LOGIC: "chartype.logic",
    AND: "chartype.logic.and",
    OR: "chartype.logic.or",
    NOT: "chartype.logic.not",



    HASH: "chartype.hash",
    AT: "chartype.at",

    SPACE: "chartype.space",
    LINEBREAK: "chartype.linebreak",

    SPECIAL: "chartype.specialchar"
}




var FLAGS = {
    "type": null,
    "instance": null,
    "alias": null,
    "constructor": null,
    "model": null,
    "named": null,
    "action": null
};

/**
 * All commands
 * 
 * Command item:
 * [isFirst:boolean, action:function]
 */
var COMMANDS = [
    "return", "ret", "if", "else", "elseif", "while", "for", "switch", "repeat", "generate",
    "iter", "iterate"
];




var CHARS_ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
var CHARS_NUM = "0123456789";

var SYMBOLS = " ++ -- ** // /* */ >> :: >= <= != && || ";


/** Checks if a group of special chars can form a symbol */
var canSymbol = (chars) => SYMBOLS.includes(chars);


/** Gets SubcomponentType of symbol */
var getSymbolType = (symbol) => {
    let symbol_correspondents = {
        "++": SymbolType.PLUS2,
        "--": SymbolType.MINUS2,
        "**": SymbolType.ASTERISK2,
        "//": SymbolType.COMMENT_LINE,
        "/*": SymbolType.COMMENT_BLOCK,
        "*/": SymbolType.COMMENT_BLOCK,
        ">>": SymbolType.GREATERTHAN2,
        "::": SymbolType.COLON2,
        ">=": SymbolType.GREATOREQUAL, 
        "<=": SymbolType.LESSOREQUAL, 
        "!=": SymbolType.NOTEQUAL, 
        "&&": SymbolType.AND2,
        "||": SymbolType.OR2
    };

    return symbol_correspondents[symbol];
};

var CharGroups = [
    [CharType.ALPHA, CHARS_ALPHA],
    
    [CharType.NUM, CHARS_NUM],
    
    [CharType.DOT, "."],
    [CharType.COMMA, ","],
    [CharType.COLON, ":"],
    [CharType.QUESTION, "?"],

    [CharType.STRING_SINGLE, "'"],
    [CharType.STRING_DOUBLE, "\""],

    [CharType.GROUP_PARENTHESES, "()"],
    [CharType.GROUP_BRACKET, "[]"],
    [CharType.GROUP_CURLY, "{}"],


    [CharType.EQUAL, "="],
    [CharType.LESSTHAN, "<"],
    [CharType.GREATERTHAN, ">"],


    [CharType.PLUS, "+"],
    [CharType.MINUS, "-"],
    [CharType.ASTERISK, "*"],
    [CharType.SLASH, "/"],
    [CharType.PERCENT, "%"],

    
    [CharType.HASH, "#"],
    [CharType.AT, "@"],


    [CharType.AND, "&"],
    [CharType.OR, "|"],
    [CharType.NOT, "!"],


    [CharType.SPACE, " \s\t"],
    [CharType.LINEBREAK, "\n"]
];

// Checks what CharType a character is
function charTypeOf(char) {


    // Searches in CharGroups
    for(let chargroup of CharGroups) {
        
        let cgtype = chargroup[0];
        let cgarr = chargroup[1];
        if(cgarr.includes(char)) return cgtype;
    
    }

    // If not found, then return as special character
    return CharType.SPECIAL;
}

/** Checks if char/symbol is a group opening */
var isOpening = (groupchar) => " ( [ { /* // ".includes(groupchar);

/** Checks if char is a group closing */
var isClosing = (groupchar) => " ) ] } */ ".includes(groupchar);


/** Checks if a char can initiate a variable name */
var startsName = (char) => (CHARS_ALPHA+"_").includes(char);


/** Checks if a char can initiate a number */
var startsNumber = (char) => (CHARS_NUM).includes(char);


/** Gets corresponding SubcomponentType for CharType */
var getSCType = (charType) => {

    let correspondents = {};
    correspondents[CharType.STRING_SINGLE] = SubComponentType.STRING_SINGLE;
    correspondents[CharType.STRING_DOUBLE] = SubComponentType.STRING_DOUBLE;
    correspondents[CharType.GROUP_PARENTHESES] = SubComponentType.GROUP_PARENTHESES;
    correspondents[CharType.GROUP_BRACKET] = SubComponentType.GROUP_BRACKET;
    correspondents[CharType.GROUP_CURLY] = SubComponentType.GROUP_CURLY;

    correspondents[SymbolType.COMMENT_LINE] = SubComponentType.COMMENT_LINE;
    correspondents[SymbolType.COMMENT_BLOCK] = SubComponentType.COMMENT_BLOCK;

    let sctype = correspondents[charType];

    if(sctype) return sctype; else 
        throw new Error(`FatalException: CharType '${charType}' does not have a corresponding SubcomponentType`);

}


/** Checks if a symbol anticipates (must be followed by a component) */
var symbolAnticipates = (symbol) => " + - * / % : :: >> = | & ! < > . >= <= != && || ".includes(symbol);
    
