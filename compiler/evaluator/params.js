
function evaluateParameters(parameters, args, address, position) {
    

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


    let param_names = Object.keys(optional_named_params);
    for(let i=0; i<param_names.length; i++) {
        let param_name = param_names[i];
        let param = optional_named_params[param_name];

        let param_address = getAddress(address, param_name);
        setVariable(param_address, evaluateValue(param.default_value, param_address));
    }


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

                } else throwException(`ArgumentException: Only ${bland_params.length + unnamed_params.length} `+
                    `unnamed/positional parameter(s) was expected, but found more in args`, arg.start);
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
                throwException(`ArgumentException: Named parameter '${arg.variable_name}' was not found (maybe you forgot to add the @named flag?)`, arg.start);
            
        }
    }

    // Now, check for any unset bland parameters
    if(bland_done<bland_params.length) 
        throwException(`ArgumentException: Function call expected ${bland_params.length} `+
            `required unnamed/positional args, but only ${bland_done} found`, position);

    // Then, check for any unset required named parameters
    if(required_named_done<required_named_params.length()) 
        throwException(`ArgumentException: Function call expected ${required_named_params.length()} `+
            `required named args, but only ${required_named_done} found`, position);



}