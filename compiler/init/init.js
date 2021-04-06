
var ExceptionType = {

    COMPILE: "exception.compile",
    SYNTAX: "exception.compile.syntax",
    GROUP_UNMATCHED: "exception.compile.syntax.group.unmatched",
    GROUP_UNCLOSED: "exception.compile.syntax.group.unclosed",
    ANTICIPATION_UNCLOSED: "exception.compile.syntax.anticipation.unclosed",
    UNEXPECTED: "exception.compile.syntax.unexpected"

};


String.prototype.isOf = function(parent) {
    return this.startsWith(parent);
};

var throwException = function(_, __) {};

function interpret(source, path) {
    throwException = function(message, position) {

        let refpath = path + ":" + position.line + ":" + position.column;
        let errormsg = `\n--------------------------------------\n\n`+
            `${message} \n\nat './${refpath}'\n\n`+
            `--------------------------------------\n\n`;

        console.log(errormsg.red);
        
        // let error = new Error();
        // error.stack = "";

        throw "";
    };

    let lexed = lex2(lex1(source));
    startExecution(lexed);
}


/** Checks if a SubComponentType is a character of given charType */
String.prototype.isChar = function(chartype) {
    return this.endsWith(chartype);
}