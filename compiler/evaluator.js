
// Native methods can only accept primitive values
let native_methods = {
    print: function(args) {
        let primitives = args.map(arg=>extractCrumb(arg));
        console.log(...primitives);
        
        return new Crumb([], null, "native");
    }
};


function extractCrumb(crumb) {
    return crumb.isCrumb ? crumb.value : crumb;
}


function startExecution(root) {
    let variables = {};
    
    let idcounter = 0;
    let generateAddress = function() {
        return "anonymous-"+(idcounter++);
    };

    let path_separator = "<"+(11111111 + Math.floor(Math.random()*99999999))+">";
    let type_separator = "<"+(1111111 + Math.floor(Math.random()*9999999))+">";





    let setVariable = function(address, value) {
        variables[address] = value;
    }


    let getDirectValueLabel = function(directvalue = new DirectValue()) {
        if(directvalue.value_type.isOf(DirectValueType.VARIABLE))
            return directvalue.value;
        else return directvalue.type + type_separator + directvalue.value;
    };

    let getAddress = function(...addresses) {
        return addresses.join(path_separator);
    }

    let getUnnamedAddress = function(...addresses) {
        return [...addresses, "unnamed-values"].join(path_separator);
    }

    let evaluateValue = function(valuecontext = new Context(), address = "root", deep = true) {



        // If valuecontext is already a crumb, return it instantly

        if(valuecontext.type.isOf(ContextType.CRUMB))
            return valuecontext;
        

        // Or if it is a raw scope, returned a crumb from it
        if(valuecontext.type.isOf(ContextType.SCOPE))
            return new ScopeCrumb(valuecontext, address);

        // Or if it is a command
        
        if(valuecontext.type.isOf(ContextType.COMMAND))
            return executeCommand(valuecontext, address);


        switch(valuecontext.type) {

            case ContextType.DIRECT_VALUE:
                return evaluateDirectValue(valuecontext, address, deep);
        
            case ContextType.CALL:
                return evaluateCallChain(valuecontext, address);

            case ContextType.OPERATION:
                return evaluateOperation(valuecontext, address);

            case ContextType.VALUE:
                return evaluateValue(valuecontext.value, address, deep);

            case ContextType.COMPARE:
                return evaluateCompare(valuecontext, address);

            case ContextType.LOGIC:
                return evaluateLogic(valuecontext, address);

        }

        return nullCrumb();

    };

    let evaluateOperation = function(operationcontext = new OperationContext(), address = "root") {
        
        let args = operationcontext.args;
        if(args.length==0) return nullCrumb();
        
        let currentCrumb = evaluateValue(args[0], address);

        let isboth = function(l, r, type) {
            return typeof(l) === type && typeof(r) === type;
        };

        let isonly = function(l, r, types) {
            return types.includes(typeof(l)) && types.includes(typeof(r));
        };

        let segregate = function(l, r, type_pair) {
            return [
                typeof(l)===type_pair[0] ? l : r,
                typeof(l)===type_pair[0] ? r : l,
            ];
        };


        for(let i = 2; i<args.length; i+=2) {
            let operation = args[i-1];

            let left = currentCrumb;
            let right = evaluateValue(args[i], address);

            // First, either side must only be a primitive value
            if(!left.isPrimitive || !left.isPrimitive) 
                
                throw(`RuntimeException: Only primitive types (String, Number, Boolean, null) `+
                    `can be used with operations, `+
                    `at line ${operation.start.line} column ${operation.start.column}`);

            let left_digestible = extractCrumb(left);
            let right_digestible = extractCrumb(right);

            switch(operation.type) {
                case OperationType.ADD:
                    currentCrumb = new Crumb([], left_digestible + right_digestible, address);
                break;
                case OperationType.SUBTRACT:
                    if(typeof(left_digestible)=="number" && typeof(right_digestible)=="number") {
                        currentCrumb = new Crumb([], left_digestible - right_digestible, address);
                    } else throw(`RuntimeException: Only numbers can be subtracted, `+
                    `at line ${operation.start.line} column ${operation.start.column}`);
                break;
                case OperationType.MULTIPLY:
                    // First, both cannot be strings
                    if(isboth(left_digestible, right_digestible, "string")) 
                        throw(`RuntimeException: Strings cannot be multiplied to each other, `+
                            `at line ${operation.start.line} column ${operation.start.column}`);

                    // Then, they should only be either numbers or string
                    if(!isonly(left_digestible, right_digestible, ["string", "number"]))
                        throw(`RuntimeException: Only [String,Number] and [Number,Number] can be multiplied, `+
                            `at line ${operation.start.line} column ${operation.start.column}`);

                    if(isboth(left_digestible, right_digestible, "number")) {
                        currentCrumb = new Crumb([], left_digestible * right_digestible, address);
                    } else {
                        let segregated = segregate(left_digestible, right_digestible, ["string", "number"]);
                        if(segregated[1]<0) throw(`RuntimeException: Only non-negative values are allowed to multiply strings, `+
                            `at line ${operation.start.line} column ${operation.start.column}`);
                        currentCrumb = new Crumb([], segregated[0].repeat(Math.floor(segregated[1])), address);
                    }
                break;
                case OperationType.DIVIDE:
                    if(typeof(left_digestible)=="number" && typeof(right_digestible)=="number") {
                        currentCrumb = new Crumb([], left_digestible / right_digestible, address);
                    } else throw(`RuntimeException: Only numbers can be divided, `+
                    `at line ${operation.start.line} column ${operation.start.column}`);
                break;
                case OperationType.MODULO:
                    if(typeof(left_digestible)=="number" && typeof(right_digestible)=="number") {
                        currentCrumb = new Crumb([], left_digestible % right_digestible, address);
                    } else throw(`RuntimeException: Only numbers can be applied with modulo, `+
                    `at line ${operation.start.line} column ${operation.start.column}`);
                break;
                
            }
        }

        return currentCrumb;

    };

    let evaluateDirectValue = function(directvalue = new DirectValue(), address = "root", deep = true) {
        switch(directvalue.value_type) {
            case DirectValueType.VARIABLE:
                return deep ? 
                    extractVariable(directvalue.value, address, directvalue.start) : 
                    directvalue;
            case DirectValueType.STRING:
                return new Crumb([], directvalue.value, address);
            case DirectValueType.NUMBER:
                return new Crumb([], directvalue.value, address);
            case DirectValueType.BOOL:
                return new Crumb([], directvalue.value, address);
            case DirectValueType.NULL:
                return new Crumb([], null, address);
        }
    };

    let evaluateCallChain = function(callcontext = new CallContext(), address = "root") {
        let currentCrumb = evaluateValue(callcontext.root_value, address);

        for(let call of callcontext.call_chain) {
            switch(call.call_type) {
                case CallType.FUNCTION:

                    let args = call.value;

                    if(currentCrumb.type==ContextType.NATIVE_METHOD) {

                        // When passing args to native method, 
                        // they must be in crumbs already
                        let crumbArgs = args.map(arg=>evaluateValue(arg.value, address));
 
                        currentCrumb = currentCrumb.value(crumbArgs);

                    } else if(currentCrumb.type.isOf(ContextType.SCOPE_CRUMB)) {
                        let scope_address = getAddress(address, generateAddress());
                        currentCrumb = executeScope(
                            currentCrumb.value, scope_address, args);
                    }
                break;
            }
        }

        return currentCrumb;
    };

    /** Must only return a crumb */
    let extractVariable = function(variable_name, address, position) {

        let address_arr = address.split(path_separator);

        for(let i = address_arr.length; i>0; i--) {
            let temp_address = getAddress(...address_arr.slice(0, i), variable_name);

            if(variables[temp_address]!==undefined) {
                return evaluateValue(variables[temp_address], temp_address);
            }
        }

        // If passes here, means not found, so try the natives
        if(native_methods[variable_name]!==undefined) {
            return new NativeCrumb(native_methods[variable_name], address);
        }
        

        throw(`NameException: Variable '${variable_name}' not found at `+
            `line ${position.line} column ${position.column}`);
    };

    let executeSetter = function(settercontext = new SetterContext(), address = "root") {
        for(let feed of settercontext.feeds) {

            if(feed.type.isOf(ContextType.DIRECT_VALUE)) {

                let feed_address = getAddress(address, getDirectValueLabel(feed));
                setVariable(feed_address, 
                    evaluateValue(settercontext.feed_value, feed_address, false));



            } else {

                if(variables[getUnnamedAddress(address)]===undefined) 
                    variables[getUnnamedAddress(address)] = [];

                variables[getUnnamedAddress(address)].push(evaluateValue(feed));

            }
        }
    };

    let evaluateParameters = function(parameters, args, address, position) {
        

        let bland_params = [];
        let unnamed_params = [];



        Map.prototype.length = function() {
            return Object.keys(this).length;
        };

        let required_named_params = new Map();
        let optional_named_params = new Map();
        

    
        
        // First, spread all parameters
        for(let param of parameters) {
            if(hasFlag(param.parameter_flags, "named")) {
                if(param.default_value===undefined)
                    required_named_params[param.variable_name] = param;
                else optional_named_params[param.variable_name] = param;
            } else {
                if(param.default_value===undefined)
                    bland_params.push(param);
                else unnamed_params.push(param);
            }
        }



        // Then pre-set all parameters with default value 
        // (unnamed_params, optional_named_params)

        for(let param of unnamed_params) {
            let param_address = getAddress(address, param.variable_name);
            setVariable(param_address, evaluateValue(param.default_value, param_address));
        }

        optional_named_params.forEach((param_name, param)=>{
            let param_address = getAddress(address, param_name);
            setVariable(param_address, evaluateValue(param.default_value, param_address));
        });



        let bland_done = 0;
        let unnamed_done = 0;
        let required_named_done = 0;
        
        
        for(let i = 0; i < args.length; i++) {
            let arg = args[i];

            if(arg.variable_name===undefined) {

                

                if(bland_done<bland_params.length) {
                    // Current argument is for bland param
                
                    let param = bland_params[bland_done];
                    let param_address = getAddress(address, param.variable_name);
                    setVariable(param_address, evaluateValue(arg.value, param_address));

                    bland_done++;
                } else {
                    // Current argument is for defaulted param
                    if(unnamed_done < unnamed_params.length) {

                        let param = unnamed_params[unnamed_done];
                        let param_address = getAddress(address, param.variable_name);
                        setVariable(param_address, evaluateValue(arg.value, param_address));

                        unnamed_done++;

                    } else throw(`ArgumentException: Only ${bland_params.length + unnamed_params.length} `+
                        `unnamed/positional parameter(s) was expected, but found more in args, at ` +
                        `line ${arg.start.line} column ${arg.start.column}`);
                }
                    
            } else {

                // Current argument is for named
                if(required_named_params[arg.variable_name]!==undefined) {
                    let param = required_named_params[arg.variable_name];

                    let param_address = getAddress(address, param.variable_name);
                    setVariable(param_address, evaluateValue(arg.value, param_address));

                    required_named_done++;

                } else if(optional_named_params[arg.variable_name]!==undefined) {
                    let param = optional_named_params[arg.variable_name];

                    let param_address = getAddress(address, param.variable_name);
                    setVariable(param_address, evaluateValue(arg.value, param_address));
                } else
                    throw(`ArgumentException: Parameter '${arg.variable_name}' was not found, `+
                        `at line ${arg.start.line} column ${arg.start.column}`);
                
            }
        }

        // Now, check for any unset bland parameters
        if(bland_done<bland_params.length) 
            throw(`ArgumentException: Function call expected ${bland_params.length} `+
                `required unnamed/positional args, but only ${bland_done} found, at` +
                `line ${position.line} column ${position.column}`);

        // Then, check for any unset required named parameters
        if(required_named_done<required_named_params.length()) 
            throw(`ArgumentException: Function call expected ${required_named_params.length()} `+
                `required named args, but only ${required_named_done} found, at` +
                `line ${position.line} column ${position.column}`);



    };


    // The isShallow argument asserts whether the scope
    // cannot return a value of itself with #return command. 
    // If true, any #return commands is passed on to parent scope
    // instead of returning it on itself
    let executeScope = function(scope = new GroupContext(), 
        address = "root", args = [], isShallow = false) {

        if(scope.parameters !== undefined && scope.parameters.length > 0) 
            evaluateParameters(scope.parameters, args, address, scope.start);
        
        for(let context of scope.contents) {
            if(context.type==ContextType.SETTER) {
                executeSetter(context, address);
            } else {
                let valuecrumb = evaluateValue(context, address);

                // If shallow, return whole ReturnCrumb, else just value
                if(valuecrumb.type==ContextType.RETURN_CRUMB)
                    return isShallow ? valuecrumb : valuecrumb.value;
                
                    
            }
        }

        return nullCrumb();
    }

    let executeCommand = function(commandcontext = new CommandContext(), address = "root") {
        

        let args = commandcontext.args;
        let position = commandcontext.start;
        switch(commandcontext.name) {
            case "return":
                return new ReturnCrumb(evaluateValue(args, address), address);
            case "if":
                let value = undefined;
                let isAction = true;


                // Try every if-conditions

                for(let condition_item of commandcontext.if_statements) {
                    let condition_value = extractCrumb(evaluateValue(condition_item.condition, address));
                    
                    if(condition_value===true) {

                        if(condition_item.isAction)
                            value = executeScope(condition_item.content, address, [], true);
                        else return evaluateValue(condition_item.content);

                        break;
                    } else if(condition_value!==false) 
                        throw(`ConditionException: Only booleans can be passed as condition `+
                            `in if-else statements as line ${commandcontext.start.line} ` +
                            `column ${commandcontext.start.column}`);

                }

                // Else, do the else
                if(value == undefined && commandcontext.else_statement!==undefined) {
                    let else_statement = commandcontext.else_statement;
                    if(else_statement.isAction)
                        value = executeScope(else_statement.content, address, [], true);
                    else return evaluateValue(else_statement.content);
                }
                
                if(value!==undefined && value.type.isOf(ContextType.RETURN_CRUMB))
                    return value;


            break;
            
        }

        return nullCrumb();
    }

    let evaluateCompare = function(comparecontext = new CompareContext(), address = "root") {
        

        let left_value = extractCrumb(evaluateValue(comparecontext.left, address));
        let right_value = extractCrumb(evaluateValue(comparecontext.right, address));

        let compare_value = false;
        
        switch(comparecontext.compare_type) {

            case CompareType.EQUAL:
                compare_value = left_value === right_value;
            break;

            case CompareType.GREATERTHAN:
                compare_value = left_value > right_value;
            break;

            case CompareType.LESSTHAN:
                compare_value = left_value < right_value;
            break;

            case CompareType.GREATOREQUAL:
                compare_value = left_value >= right_value;
            break;

            case CompareType.LESSOREQUAL:
                compare_value = left_value <= right_value;
            break;

            case CompareType.NOTEQUAL:
                compare_value = left_value != right_value;
            break;
        }
        
        return new Crumb([], compare_value, address, true);
    }

    let evaluateLogic = function(logiccontext = new LogicContext(), address = "root") {
        
        let left_value = extractCrumb(evaluateValue(logiccontext.left));
        let right_value = extractCrumb(evaluateValue(logiccontext.right));

        let logic_value = false;

        let areBooleans = function(...values) {
            for(let value of values) if(value!==true || value!==false) return false;
            return true;
        };

        if(!areBooleans(left_value, right_value)) 
            throw(`LogicException: Only booleans can be passed in && and || conditions,  `+
                `at line ${logiccontext.start.line} ` +
                `column ${logiccontext.start.column}`);

        switch(logiccontext.logic_type) {
            case LogicType.AND:
                logic_value = left_value && right_value;
            
            case LogicType.OR:
                logic_value = left_value || right_value;
        }

        return new Crumb([], logic_value, address, true);

    }


    executeScope(root);

    //console.log({variables});
}




function nullCrumb(address) {
    return new Crumb([], null, address);
}

/** Checks if a given type name exists in a group of types  */
function hasType(types = [new TypeItem()], typename = "") {
    for(let typeitem of types) {
        let typeitem_name = typeitem.name;
        if(typeitem_name==typename) return true;
    }

    return false;
}

class Crumb extends Context {
    constructor(types, value, address, isPrimitive = true) {
        super(ContextType.CRUMB);

        this.isCrumb = true;
        this.types = types;
        this.value = value;
        this.address = address;
        this.isPrimitive = isPrimitive;
    }
}

class NativeCrumb extends Crumb {
    constructor(func, address) {
        super([], func, address);
        this.type = ContextType.NATIVE_METHOD;
    }
}

class ScopeCrumb extends Crumb {
    constructor(scope, address) {
        super([], scope, address);
        this.type = ContextType.SCOPE_CRUMB;
    }
}

/** A wrapper for crumb which tells the nearest scope to return the crumb */
class ReturnCrumb extends Crumb {
    constructor(crumb, address) {
        super([], crumb, address);
        this.type = ContextType.RETURN_CRUMB;
    }
}