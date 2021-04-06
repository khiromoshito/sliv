
function evaluateOperation(operationcontext = new OperationContext(), address = "root") {
    
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
            
            throwException(`RuntimeException: Only primitive types (String, Number, Boolean, null) `+
                `can be used with operations`, operation.start);

        let left_digestible = extractCrumb(left);
        let right_digestible = extractCrumb(right);

        switch(operation.type) {
            case OperationType.ADD:
                currentCrumb = new Crumb([], left_digestible + right_digestible, address);
            break;
            case OperationType.SUBTRACT:
                if(typeof(left_digestible)=="number" && typeof(right_digestible)=="number") {
                    currentCrumb = new Crumb([], left_digestible - right_digestible, address);
                } else throwException(`RuntimeException: Only numbers can be subtracted`, operation.start);
            break;
            case OperationType.MULTIPLY:
                // First, both cannot be strings
                if(isboth(left_digestible, right_digestible, "string")) 
                    throwException(`RuntimeException: Strings cannot be multiplied to each other`, operation.start);

                // Then, they should only be either numbers or string
                if(!isonly(left_digestible, right_digestible, ["string", "number"]))
                    throwException(`RuntimeException: Only [String,Number] and [Number,Number] can be multiplied`, operation.start);

                if(isboth(left_digestible, right_digestible, "number")) {
                    currentCrumb = new Crumb([], left_digestible * right_digestible, address);
                } else {
                    let segregated = segregate(left_digestible, right_digestible, ["string", "number"]);
                    if(segregated[1]<0) throwException(`RuntimeException: Only non-negative values are allowed to multiply strings`, operation.start);
                    currentCrumb = new Crumb([], segregated[0].repeat(Math.floor(segregated[1])), address);
                }
            break;
            case OperationType.DIVIDE:
                if(typeof(left_digestible)=="number" && typeof(right_digestible)=="number") {
                    currentCrumb = new Crumb([], left_digestible / right_digestible, address);
                } else throwException(`RuntimeException: Only numbers can be divided`, operation.start);
            break;
            case OperationType.MODULO:
                if(typeof(left_digestible)=="number" && typeof(right_digestible)=="number") {
                    currentCrumb = new Crumb([], left_digestible % right_digestible, address);
                } else throwException(`RuntimeException: Only numbers can be applied with modulo`, operation.start);
            break;
            
        }
    }

    return currentCrumb;

};