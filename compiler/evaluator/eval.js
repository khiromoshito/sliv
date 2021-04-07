


/** Must only return a crumb */
let extractVariable = function(variable_name, address, position, instance) {
    
    if(instance!==undefined || instance !=undefined) console.log(instance);

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
    

    throwException(`NameException: Variable '${variable_name}' not found`, position);
};

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


let getDirectValueLabel = function(directvalue) {
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








// The isShallow argument asserts whether the scope
// cannot return a value of itself with #return command. 
// If true, any #return commands is passed on to parent scope
// instead of returning it on itself
let executeScope = function(scopecontext = new GroupContext(), 
    address = "root", args = [], isShallow = false, isInstance = false) {

    let scope = isInstance ? scopecontext.value : scopecontext;

    if(scope.parameters !== undefined && scope.parameters.length > 0) 
        evaluateParameters(scope.parameters, args, address, scope.start);
    
    for(let context of scope.contents) {
        if(context.type==ContextType.SETTER) {
            if(isInstance)
                executeSetter(context, address, true, scopecontext);
            else
                executeSetter(context, address);
        } else {
            let valuecrumb = evaluateValue(context, address, true, 
                isInstance ? scopecontext : undefined);

            // If shallow, return whole ReturnCrumb, else just value
            if(valuecrumb.type==ContextType.RETURN_CRUMB)
                return isShallow ? valuecrumb : valuecrumb.value;
            
                
        }
    }

    return nullCrumb();
}


function startExecution(root) {

    executeScope(root);
    //console.log(variables);

    //console.log({variables});
}






/** Checks if a given type name exists in a group of types  */
function hasType(types = [new TypeItem()], typename = "") {
    for(let typeitem of types) {
        let typeitem_name = typeitem.name;
        if(typeitem_name==typename) return true;
    }

    return false;
}

function hasEitherTypes(types = [new TypeItem()], typenames = []) {
    for(let typeitem of types) {
        let typeitem_name = typeitem.name;

        for(let typename of typenames)
            if(typeitem_name==typename) return true;
    }

    return false;
}
