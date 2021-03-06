


var ContextType = {
    ROOT: "context.root",                   // root 

    SETTER: "context.setter",               // name: "John Doe"
    CRUMB: "context.crumb",
    NATIVE_METHOD: "context.crumb.native", 
    SCOPE_CRUMB: "context.crumb.scope",
    PATH_CRUMB: "context.crumb.path",
    RETURN_CRUMB: "context.crumb.return",
    ENTRY_CRUMB: "context.crumb.return",
    INSTANCE_CRUMB: "context.crumb.instance",
    
    TYPE: "context.type",                   // [String]
    FLAG: "context.flag",                   // @instance
    COMMAND: "context.command",             // #return "Hello world"

    IF_COMMAND: "context.command.ifelse",
    ITER_COMMAND: "context.command.for",
    WHILE_COMMAND: "context.command.while",
    SWITCH_COMMAND: "context.command.switch",

    OPERATION: "context.operation",         // 2 + 3
    COMPARE: "context.compare",             // 2 > 3
    LOGIC: "context.logic",                 // true && false

    CALL: "context.call",
    FUNCTION_CALL: "context.function-call", // add(1, 2)
    PROPERTY_GET: "context.property",       // person.name
    ENTRY_GET: "context.entry",             // fruits{"apple"}

    VALUE: "context.value",
    VALUE_GROUP: "context.value.group",      // (2+3)
    DIRECT_VALUE: "context.value.direct",

    SCOPE: "context.scope",                   // { ... }
    FUNCTION: "context.scope.function",
    LAMBDA: "context.scope.function.lambda",
    FUNCTION_PARAMS: "context.functionparams",
    CLASS: "context.scope.class",
    LIST: "context.scope.list",
    MAP: "context.scope.map",


}



class Context {
    constructor(type) {
        this.type = type;
        this.start = {line: 0, column: 0};
        this.end = {line: 0, column: 0};
    }
}



class FlagItem {
    constructor() {
        this.name = "";
        this.start = {line: 0, column: 0};
        this.end = {line: 0, column: 0};
    }
}

function hasFlag(flags, name) {
    for(let flag of flags)
        if(flag.name===name) return true;
    return false;
}

function hasEitherFlags(flags, names) {
    for(let flag of flags)
        if(names.includes(flag.name)) return true;
    return false;
}

class CommandContext extends Context {
    constructor(name, args, start, type = ContextType.COMMAND) {
        super(type);

        this.name = name;
        this.args = args;
        this.start = start;
    }
}

class IfCommandContext extends CommandContext {
    constructor(if_statements, else_statement, start) {
        super("if", [], start, ContextType.IF_COMMAND);

        this.if_statements = if_statements;
        this.else_statement = else_statement;
    }
}

class IterationContext extends CommandContext {
    constructor(parameters, action, start) {
        super("for", [], start, ContextType.ITER_COMMAND);
        
        this.action = action;
        this.parameters = parameters;
    }
}

// class IterItemContext {
//     constructor() {
//         this.key;
//         this.value;
//     }
// }



class IfCommandItem {
    constructor(condition, content, isAction, start) {
        
        /** Asserts whether the "if" command acts or returns a value.
         *   If true, it will not return a value unless a #return
         * command is passed inside the command scope. 
         *   If false, the value after the colon is returned */ 
        this.isAction = isAction;

        this.condition = condition;
        this.content = content;
        this.start = start;
    }
}




class TypeContext extends Context {
    constructor() {
        super(ContextType.TYPE);

        this.type_items = [];
    }
}

class TypeItem {
    constructor() {
        this.name = "";
        this.subtype = null;
    }
}

class ValueContext extends Context {
    constructor() {
        super(ContextType.VALUE);

        this.value_flags = [];
        this.value_typecast = null;
        this.value = null;
    }
}


var DirectValueType = {
    VARIABLE: "directvalue.variable",
    STRING: "directvalue.string",
    NUMBER: "directvalue.number",
    BOOL: "directvalue.bool",
    NULL: "directvalue.null",
}

class DirectValue extends Context {
    constructor(type, value, start) {
        super(ContextType.DIRECT_VALUE);

        this.value_type = type;
        this.value = value;
        this.start = start;
    }
}


class OperationContext extends Context {
    constructor(args = []) {
        super(ContextType.OPERATION);

        this.args = args;
    }
}

var OperationType = {
    ADD: "operation.add",
    SUBTRACT: "operation.subtract",
    MULTIPLY: "operation.multiply",
    DIVIDE: "operation.divide",
    MODULO: "operation.modulo",
};

function formOperationSymbol(subcomponent) {
    let correspondents = [
        [CharType.PLUS, OperationType.ADD],
        [CharType.MINUS, OperationType.SUBTRACT],
        [CharType.ASTERISK, OperationType.MULTIPLY],
        [CharType.SLASH, OperationType.DIVIDE],
        [CharType.PERCENT, OperationType.MODULO]
    ];

    for(let correspondent of correspondents) {
        if(subcomponent[0].endsWith(correspondent[0]))
            return new OperationSymbol(correspondent[1], subcomponent[2][0]);
    }

    // Return null-typed opsymbol by default
    return new OperationSymbol(null);
}

class OperationSymbol {
    constructor(type, start = {line: 0, column: 0}) {
        this.type = type;
        this.isOperationSymbol = true;
        this.start = start;
    }
}



var CompareType = {
    GREATERTHAN: "compare.greaterthan",
    LESSTHAN: "compare.lessthan",
    GREATOREQUAL: "compare.greatorequal",
    LESSOREQUAL: "compare.lessorequal",
    EQUAL: "compare.equal",
    NOTEQUAL: "compare.notequal",
};


class CompareContext extends Context {
    constructor(left, type, right) {
        super(ContextType.COMPARE);

        this.left = left;
        this.compare_type = type;
        this.right = right;
    }
}

function getCompareType(subcomponent) {
    let correspondents = [
        [CharType.EQUAL, CompareType.EQUAL],
        [CharType.GREATERTHAN, CompareType.GREATERTHAN],
        [CharType.LESSTHAN, CompareType.LESSTHAN],
        [SymbolType.GREATOREQUAL, CompareType.GREATOREQUAL],
        [SymbolType.LESSOREQUAL, CompareType.LESSOREQUAL],
        [SymbolType.NOTEQUAL, CompareType.NOTEQUAL]
    ];

    for(let correspondent of correspondents) 
        if(subcomponent[0].includes(correspondent[0]))
            return correspondent[1];

    return null;
}

function isComparator(subcomponent) {
    return getCompareType(subcomponent) !== null;
}


var LogicType = {
    OR: "logic.or",
    AND: "logic.and"
};


class LogicContext extends Context {
    constructor(left, type, right, start) {
        super(ContextType.LOGIC);

        this.left = left;
        this.logic_type = type;
        this.right = right;
        this.start = start;
    }
}

function getLogicType(subcomponent) {
    let correspondents = [
        [SymbolType.OR2, LogicType.OR],
        [SymbolType.AND2, LogicType.AND]
    ];

    for(let correspondent of correspondents) 
        if(subcomponent[0].includes(correspondent[0]))
            return correspondent[1];

    return null;
}

function isLogicGate(subcomponent) {
    return getLogicType(subcomponent) !== null;
}

class SetterContext extends Context {
    constructor(flags = [], type = null, feeds = [], value = null) {
        super(ContextType.SETTER);

        this.setter_flags = flags;
        this.setter_type =  type;
        this.feeds = feeds;

        this.feed_value = value;
    }
}


class GroupContext extends Context {
    constructor(type) {
        super(type);

        this.contents = [];
    }
}


class ScopeContext extends GroupContext {
    constructor() {
        super(ContextType.SCOPE);

        this.contents = [];
    }
}

class AnonymousFunctionContext extends GroupContext {
    constructor() {
        super(ContextType.FUNCTION);

        this.parameters = [];
    }
}

class LambdaFunctionContext extends Context {
    constructor() {
        super(ContextType.LAMBDA);

        this.parameters = [];
        this.scope = new ScopeContext();
    }
}


class ParameterItem {
    constructor() {
        this.parameter_flags = [];
        this.parameter_type =  null;
        this.variable_name = undefined;
        this.default_value = undefined;

        this.start = {line: 0, column: 0};
        this.end = {line: 0, column: 0};
    }
}

class ArgumentItem {
    constructor() {
        this.variable_name = undefined;
        this.value = undefined;
        this.start = {line: 0, column: 0};
        this.end = {line: 0, column: 0};
    }
}

class CallContext extends Context {
    constructor(root_value, call_chain = []) {
        super(ContextType.CALL);

        this.root_value = root_value;
        this.call_chain = call_chain;
    }
}

var CallType = {
    PROPERTY: "call.property",
    FUNCTION: "call.function",
    ENTRY: "call.entry"
};

class CallItem {
    constructor(type, value, start = {line: 0, column: 0}) {
        this.call_type = type;
        this.value = value;

        this.start = start;
    }
};