

/*
    Lexer1 transforms the source code into subcomponents:
        > GROUPS (BRACKET, CURLY, PARENTHESES), 
        > STRING (SINGLE, DOUBLE)
        > NAME
        > FLAG (starts with @)
        > COMMAND (starts with #)
        > COMMENT (LINE, BLOCK)
        > NUMBER
        > SYMBOL
*/



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


    [CharType.SPACE, " "],
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
        throw(`PrecompilerException: CharType '${charType}' does not have a corresponding SubcomponentType`);

}


/** Checks if a symbol anticipates (must be followed by a component) */
var symbolAnticipates = (symbol) => " + - * / % : :: >> = | & ! < > . >= <= != && || ".includes(symbol);
    



/*
    Parts of a subcomponent:
    [type, content]
*/




function lex1(source) {

    // First, a space is added at the end of the source
    // to catch any open symbols
    source += " ";
    
    /**
     * The stack corresponding to the current position on the tree
     * First item is the root, and last item is the current group.
     * Each item contain a group-type subcomponent which holds
     * an array of subcomponent items
     * 
     **/ 
    let stack = [
        [SubComponentType.ROOT, []],
        [SubComponentType.SUBCONTEXT, []]];

    /** Gets the current group from the stack (last item) */
    let getCurrent = () => stack[stack.length-1];



    /** Current active subcomponent */ 
    let cursubcomp = [SubComponentType.OPEN, "", 
        [{line: 0, column: 0}, {line: 0, column: 0}]];


    /** This represents a subcontext, 
     *  or a single strip of execution inside a group,
     *  separated by line breaks at non-anticipating points */
    let cursubcontext = [];

    /** Adds the current subcontent to the current group,
     *  clears the currentsubcomponent,
     *  and closes anticipations
     */
    let pushCurrent = () => {

        // First, update the end position for current subcomponent
        cursubcomp[2][1] = {...position};

        // Only push to current group if cursubcomp is not open (empty),
        // and it is not a comment
        if(cursubcomp[0]!=SubComponentType.OPEN && 
            !cursubcomp[0].isOf(SubComponentType.COMMENT))

            getCurrent()[1].push(cursubcomp);
        
            
        // Check if cursubcomp was a comment
        if(cursubcomp[0].isOf(SubComponentType.COMMENT)) {

            // If yes, restore anticipation state
            isAnticipating = isAnticipatingBefore;

            // Then clear cache
            isAnticipatingBefore = false;

        } else 
            // If not, turn false by default
            isAnticipating = false;

        cursubcomp = [SubComponentType.OPEN, "", [{...position}, {...position}]];
        

    };



    /** Closes the current subcontext (if any) */
    let closeSubcontext = () => {
        if(getCurrent()[0]==SubComponentType.SUBCONTEXT) {

            pushGroup();
        } else {
            // If trying to close a non-existent subcontext
            // because of a separator (in this case, comma ",")
            if(separator != null) 
                throw(ExceptionType.UNEXPECTED,
                    `Unexpected separator '${separator}'`);
        }
    }

    /** Creates a new subcontext and adds it to the stack */
    let addSubcontext = () => {
        let subcontext = [SubComponentType.SUBCONTEXT, [], [{...position, ...position}]];
        stack.push(subcontext);
    }

    /**
     * Closes the current group and pushes it to the parent group
     */
    let pushGroup = () => {
        
        pushCurrent();
        
        if(stack.length>1) {
            let parentgroup = stack[stack.length-2];
            let poppedgroup = stack.pop();

            // if popped group is a subcontext
            if(poppedgroup[0]==SubComponentType.SUBCONTEXT) {
                // push only if subcontext is not empty
                if(poppedgroup[1].length>0) parentgroup[1].push(poppedgroup);
            } else 
                // push by default
                parentgroup[1].push(poppedgroup);

        } else
            throwException(ExceptionType.UNEXPECTED, "Unexpected group closing");
    }

    /**
     * A boolean that checks if the current syntax in the
     * run is anticipating a value, meaning the next
     * syntax (except line breaks and white spaces)
     * is a continuation of the current subcomponent
     */
    let isAnticipating = false;

    /**
     * This is used to temporarily keep the isAnticipating
     * state when appending comments
     * 
     * Comments hold their own anticipation state,
     * and once closed, this isAnticipatingBefore 
     * is then recovered as new isAnticipating state
     */
    let isAnticipatingBefore = false;



    /** Current position in the iteration */ 
    let position = { line: 0, column: 0 };


    /** Function to call for exceptions */ 
    let throwException = (type, message) => {
        throw(`CompileException: ${message} at line ${position.line} column ${position.column}`);
    };





    /** Processes the current character */
    let processChar = (char) => {
        let charType = charTypeOf(char);


        // If current subcomponent is a string
        if(cursubcomp[0].isOf(SubComponentType.STRING)) {

            // If quote mark matches, push current subcomponent
            if((cursubcomp[0].isOf(SubComponentType.STRING_SINGLE) &&
                charType.isOf(CharType.STRING_SINGLE)) || 
                (cursubcomp[0].isOf(SubComponentType.STRING_DOUBLE) &&
                charType.isOf(CharType.STRING_DOUBLE))) pushCurrent();
            else 
            // Append character
            cursubcomp[1] += char;
        
        } else 
        
        // If current subcomponent is a name (variable name)
        if(cursubcomp[0].isOf(SubComponentType.NAME)) {
            
            /** Valid characters to follow */
            let validsubsequents = CHARS_ALPHA + CHARS_NUM + "_";

            // If character is valid
            if(validsubsequents.includes(char)) {
                cursubcomp[1] += char;
            } else {
                pushCurrent();

                // Current character is re-processed
                processChar(char);
            }

        } else 


        // If current subcomponent is a number
        if(cursubcomp[0].isOf(SubComponentType.NUMBER)) {
            
            /** Valid characters to follow */
            let validsubsequents = CHARS_NUM + 
                // Dot is valid if current number has no dot yet
                (!cursubcomp.includes(".") ? "." : "");

            // If character is valid
            if(validsubsequents.includes(char)) {
                cursubcomp[1] += char;
            } else {
                pushCurrent();

                // Current character is re-processed
                processChar(char);
            }

        } else


        if(cursubcomp[0].isOf(SubComponentType.COMMENT)) {
            
            // If comment is blocktype, scan for the last two chars
            // for the symbol to check if closes comment
            if(cursubcomp[0].isOf(SubComponentType.COMMENT_BLOCK)) {
                let end = cursubcomp[1].slice(-1) + char;
                let endtype = getSymbolType(end);

                //console.log(end);
                
                if(endtype.isOf(SymbolType.COMMENT_BLOCK) && isClosing(end)) {
                    // Remove the last char from the subcomponent (probably asterisk *)
                    cursubcomp[1] = cursubcomp[1].slice(0,-1);

                    // Then finally push the subcomponent
                    pushCurrent();
                } else {
                    // Else, append char
                    cursubcomp[1] += char;
                }
            } else {
                // Else, append char
                cursubcomp[1] += char;
            }
            
            
        } else


        // If current subcomponent is bracket-wrapped (type)
        // NOTE: Bracketed subcomponents have their own lexer

        if(cursubcomp[0].isOf(SubComponentType.GROUP_BRACKET)) {


            let temp_type_getCurGroup = function() {
                return temp_type_stack[temp_type_stack.length-1];
            };

            let temp_type_pushCurrent = function() {
                if(!temp_type_cursubcomp[0].isOf(SubComponentType.OPEN)) {
                    temp_type_cursubcomp[2][1] = {...position};
                    temp_type_getCurGroup()[1].push(temp_type_cursubcomp);
                    temp_type_cursubcomp = [SubComponentType.OPEN, ""];
                }
            };

            let temp_type_pushGroup = function() {
                temp_type_pushCurrent();
                let parent_group = temp_type_stack[temp_type_stack.length-2];
                parent_group[1].push(temp_type_stack.pop());
            };

            let temp_type_closeSubcontext = function() {
                // Only close subcontext if current group is subcontext
                if(temp_type_getCurGroup()[0].isOf(SubComponentType.SUBCONTEXT))
                    temp_type_pushGroup();
                    
            };
            
            // If closing ]
            if(charType.isOf(CharType.GROUP_BRACKET) && isClosing(char)) {
                
                // If no open subtypes found
                if(temp_type_stack.length<=2) {
                    temp_type_closeSubcontext();
                    cursubcomp = temp_type_stack[0];
                    pushCurrent();
                } else 
                    throwException(ExceptionType.GROUP_UNMATCHED, 
                        `Type was closed but open subtype(s) still found unclosed`);
            } else 
            
            if(temp_type_cursubcomp[0].isOf(SubComponentType.NAME)) {

                /** Valid characters to follow */
                let validsubsequents = CHARS_ALPHA + CHARS_NUM + "_";

                // If character is valid
                if(validsubsequents.includes(char)) {
                    temp_type_cursubcomp[1] += char;
                } else {
                    temp_type_pushCurrent();

                    // Current character is re-processed
                    processChar(char);
                }

            } else 
             
            if(temp_type_cursubcomp[0].isOf(SubComponentType.OPEN)) {
                
                // If can start type name
                if(charType.isOf(CharType.ALPHA)) {
                    temp_type_cursubcomp = [SubComponentType.NAME, char,
                        [{...position}, {...position}]];
                } else

                // If "?", meaning any type
                if(charType.isOf(CharType.QUESTION)) {
                    temp_type_cursubcomp = [SubComponentType.TYPE_ANY, "?",
                        [{...position}, {...position}]];
                    temp_type_pushCurrent();
                } else

                // If subtype opening "<"
                if(charType.isOf(CharType.LESSTHAN)) {
                    temp_type_pushCurrent();
                    
                    temp_type_stack.push([SubComponentType.SUBTYPE, [], 
                        [{...position}, {...position}]]);

                    temp_type_stack.push([SubComponentType.SUBCONTEXT, [], 
                        [{...position}, {...position}]]);
                } else

                // If subtype closing ">"
                if(charType.isOf(CharType.GREATERTHAN)) {
                    if(temp_type_stack.length>2) {
                        temp_type_closeSubcontext();
                        temp_type_pushGroup();
                    } else
                        throwException(ExceptionType.UNEXPECTED,
                            `Unexpected '>'`);
                } else
                
                // If "or |" separator
                if(charType.isOf(CharType.OR)) {
                    // Current subcontext must not be empty
                    if(temp_type_getCurGroup()[1].length>0) {
                        
                        // Close current subcontext, then add empty one
                        temp_type_closeSubcontext();
                        temp_type_stack.push([SubComponentType.SUBCONTEXT, [], 
                            [{...position}, {...position}]]);

                    } else 
                        throwException(ExceptionType.UNEXPECTED,
                            `Unexpected '|' at beginning without prior type value`);
                } else 

                // If another character (excluding space)
                if(!charType.isOf(CharType.SPACE))
                    throwException(ExceptionType.UNEXPECTED,
                        `Unexpected character '${char}' inside type`);
                
            }

        } else
        
        // If either a command or a flag
        if(cursubcomp[0].isOf(SubComponentType.COMMAND) || 
            cursubcomp[0].isOf(SubComponentType.FLAG)) {

            let validsubsequents = CHARS_ALPHA;

            // If char is valid for command/flag, append character
            if(validsubsequents.includes(char)) {
                cursubcomp[1] += char;
            } else {

                // Else if not valid, conclude command/flag

                // If command/flag is empty, throw Exception
                if(cursubcomp[1].length==0)
                    throwException(ExceptionType.UNEXPECTED,
                        `Unexpected '${char}'`);

                // Push current command/flag subcomponent
                pushCurrent();

                // Then re-process char
                processChar(char);

            }

        } else


        // If current subcomponent is a can-symbol
        if(cursubcomp[0].isOf(SubComponentType.SYMBOL)) {

            // Checks if char is comma
            if(charType.isOf(CharType.COMMA)) {
                
                // If yes, throw exception
                throwException(ExceptionType.UNEXPECTED,
                    `Unexpected ',' after symbol '${cursubcomp[1]}'`);
                
            }

            
            // Cumulative symbol (current symbol + char)
            let csymbol = cursubcomp[1] + char;


            // Checks if cumulative symbol can form a symbol, 
            // and also if char is not space
            if(canSymbol(csymbol) && charType != CharType.SPACE) {

                // If can, update symbol to new
                cursubcomp[1] = csymbol;

                // Then check if new symbol anticipates
                isAnticipating = symbolAnticipates(csymbol);

            } else {
                
                // If not, means the current symbol (excluding char)
                // is the only symbol

                // First, get symboltype
                let symboltype = getSymbolType(cursubcomp[1]) || SubComponentType.SYMBOL;

                // If symbol is for comments
                if(symboltype.isOf(SymbolType.COMMENT)) {
                    

                    // Get corresponding comment type (line / block)
                    let commenttype = getSCType(symboltype);


                    // If for opening comments
                    if(isOpening(cursubcomp[1])) {
                        // Update current subcomponent to a comment
                        cursubcomp = [commenttype, "", [{...position}, {...position}]];


                        // If block comment, then toggle anticipating to true
                        // (waits to be closed, linebreaks are ignored)
                        if(symboltype.isOf(SymbolType.COMMENT_BLOCK))
                            isAnticipating = true;
                        else
                            // If line comment, can then be closed with linebreak
                            isAnticipating = false;

                    } else {

                        // Else if for closing, throw exception
                        throwException(ExceptionType.UNEXPECTED,
                            `Unexpected '${cursubcomp[1]}'`);

                    }


                    

                } else {

                    let symbol = cursubcomp[1];
                    
                    // Update symbol type with symbol/char name
                    let symboltype2 = getSymbolType(symbol);

                    // For single chars, default to SPECIALCHAR + "/" + charType
                    // For more than one char, default to SYMBOL
                    if(!symboltype2) {
                        if(symbol.length==1) 
                            symboltype2 = SubComponentType.SPECIALCHAR + 
                                "/" + charTypeOf(symbol);
                        else 
                            symboltype2 = SubComponentType.SYMBOL;
                    }
                    

                    cursubcomp[0] = symboltype2;

                    // Then push current symbol subcomponent
                    pushCurrent();

                    // Check if symbol anticipates
                    isAnticipating = symbolAnticipates(symbol);

                }



                // Then re-process current char
                processChar(char);
            }
        } else


        
        // If current subcomponent is open (empty)
        if(cursubcomp[0].isOf(SubComponentType.OPEN)) {

            // If bracket (probably type)
            if(charType.isOf(CharType.GROUP_BRACKET)) {
                if(isOpening(char)) {

                    cursubcomp = [SubComponentType.GROUP_BRACKET, "", 
                        [{...position}, {...position}]];

                    isAnticipating = true;

                    temp_type_stack = [
                        [SubComponentType.GROUP_BRACKET, [], [
                            {...position}, {...position}
                        ]],
                        [SubComponentType.SUBCONTEXT, [],
                            [{...position}, {...position}]
                        ]
                    ];
                    temp_type_cursubcomp = [SubComponentType.OPEN, ""];


                } else throwException(ExceptionType.GROUP_UNMATCHED, 
                    "Unexpected closing ']'");
            } else

            if(charType.isOf(CharType.GROUP)) {
                

                if(isOpening(char)) {
                    pushCurrent();

                    // Creates a new empty group
                    let group = [
                        getSCType(charType), [], [{...position}, {...position}]
                    ];

                    // Then pushed to the stack
                    stack.push(group);


                    // Also followed by a default empty subcontext
                    // as an item to the group
                    let subcontext = [SubComponentType.SUBCONTEXT, [],
                        [{...position}, {...position}]];
                    stack.push(subcontext);

                } else {
                    if(!isAnticipating) {


                        // Closes any subcontext first
                        closeSubcontext();
                    
                        
                        // If group type matches
                        if(getCurrent()[0].isOf(getSCType(charType))) {
                            pushGroup();
                        } else {
                            throwException(ExceptionType.GROUP_UNMATCHED,
                            "The opening for current group does not match the closing");
                        }

                    } else {
                        throwException(ExceptionType.ANTICIPATION_UNCLOSED,
                        "Group unexpectedly closed without completing anticipating statement");
                    }
                }
            } else 
            
            
            if(charType.isOf(CharType.STRING)) {
                
                pushCurrent();
                
                // Creates a new empty string subcomponent
                cursubcomp = [
                    getSCType(charType), "", [{...position}, {...position}]
                ];

                isAnticipating = true;

            } else 
            
            
            if(startsName(char)) {

                pushCurrent();
                
                // Creates a new name subcomponent
                cursubcomp = [SubComponentType.NAME, char, [{...position}, {...position}]];

            } else

            if(startsNumber(char)) {

                pushCurrent();

                // Creates a new number subcomponent
                cursubcomp = [SubComponentType.NUMBER, char, [{...position}, {...position}]];

            } else
            

            // If starts a command (initiated with hash #)
            if(charType.isOf(CharType.HASH)) {
                
                // Sets an empty command subcomponent
                cursubcomp = [SubComponentType.COMMAND, "", [{...position}, {...position}]];

            } else


            // If starts a flag (initiated with atsign @)
            if(charType.isOf(CharType.AT)) {
                
                // Sets an empty flag subcomponent
                cursubcomp = [SubComponentType.FLAG, "", [{...position}, {...position}]];

            } else


            // If separator (comma ",")
            if(charType.isOf(CharType.COMMA)) {
                
                // Check if not anticipating
                if(!isAnticipating) {

                    // If not, shift to next subcontext
                    closeSubcontext(",");
                    addSubcontext();
                
                } else {

                    // If does, throw error
                    throwException(ExceptionType.ANTICIPATION_UNCLOSED,
                        `Unexpected ',' after anticipating symbol`);

                }
                
            } else 


            // Probably if char is special character, excluding space
            if(charType!=CharType.SPACE) {
            
                // First checks if char can start a symbol
                if(canSymbol(char)) {

                    // If can, then keep it as a subcontext
                    cursubcomp = [SubComponentType.SYMBOL, char, [{...position}, {...position}]];

                } else {
                    
                    // If does not start a symbol


                    // Create a lone subcomponent for the special char
                    let sctype = SubComponentType.SPECIALCHAR + "/" + charType;
                    let symbolsubcomp = [sctype, char, [{...position}, {...position}]];

                    // Now, push to current group
                    getCurrent()[1].push(symbolsubcomp);
                }


                // First, store anticipation state to cache
                isAnticipatingBefore = isAnticipating;

                // Also, check if the character anticipates
                isAnticipating = symbolAnticipates(char);

            }


        }
    };








    // ITERATOR

    /** Array for each lines */
    let lines = source.split("\n");
    

    // Through the lines
    for(let l = 0; l<lines.length; l++) {
        let line = lines[l];

        // Through the characters for each line
        for(let c = 0; c<line.length; c++) {

            // Update position
            position = { line: l, column: c };
            
            processChar(line[c]);
        }

        // If not anticipating, push subcomponent
        if(!isAnticipating) pushCurrent();

        // If still not anticipating, close any subcontext
        
        if(!isAnticipating) {

            closeSubcontext();

            // If not last line, add new empty subcontext
            if(l != lines.length-1) addSubcontext();
            
        }
            
    }



    // Iteration completed


    // Pushes the current subcomponent
    pushCurrent();


    // Checks for any unclosed anticipating statements
    if(isAnticipating)
        throwException(ExceptionType.ANTICIPATION_UNCLOSED,
        "Code scanning ended without completing anticipating statement");


    // Checks for any unclosed groups
    if(stack.length>2) {
        throwException(ExceptionType.GROUP_UNCLOSED, 
        `There are ${stack.length-2} unclosed groups at the end of the file`);
    }


    return stack[0];
}
