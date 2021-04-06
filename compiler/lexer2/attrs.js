

/** Processes the left side of a setter. Returns {type, flags, feeds} */
function processAttributes(attributes) {

    let type = null;
    let flags = [];

    /** Feeds are the variables and objects that pend to change value (set) */
    let feeds = [];

    /** The call chain of property, function, and entry calls */
    let cumulative_calls = [];

    let current_variable = null;


    /** Boolean which asserts if there is 
     * an anticipated named property (prior to DOT) */
    let isAnticipating = false;


    /** Pushes the current feed (variable+callcontext) */
    let pushFeed = function() {
        if(current_variable!==null) {
            let passable_value = current_variable;

            if(cumulative_calls.length>0) 
                passable_value = new CallContext(
                    current_variable, cumulative_calls
                );

            feeds.push(passable_value);
        }

        current_variable = null;
        cumulative_calls = [];
    };


    for(let attr of attributes) {
        
        // Check first if anticipating for property name
        if(isAnticipating) {
            // Current attribute subcontext must be variable
            if(isVariable(attr)) { 
                cumulative_calls.push(
                    new CallItem(CallType.PROPERTY, attr[1], attr[2][0]));

                isAnticipating = false;

            } else throw(`CompileException: Unexpected statement after '.' at `+
                `line ${attr[2][0].line} `+
                `column ${attr[2][0].column}`);
        } else
        
        // If type (GROUP_BRACKET)
        if(attr[0].isOf(SubComponentType.GROUP_BRACKET)) {

            if(type === null) {

                // Make sure type is set before any feeds or variable
                if(current_variable==null && feeds.length==0)
                    type = processType(attr);
                else throw(`CompileException: Type '${attr[1]}' is at wrong position `+
                    `(types must be set before variables), at `+
                    `line ${attr[2][0].line} `+
                    `column ${attr[2][0].column}`);

            } else throw(`CompileException: Invalid duplicate type '${attr[1]}' `+
                `(Only one type is allowed) at `+
                `line ${attr[2][0].line} `+
                `column ${attr[2][0].column}`);
        } else 
        
        // If variable
        if(isDirectValue(attr)) {
            
            // Push any dangling feed
            pushFeed();

            // Then update current variable
            current_variable = getDirectValue(attr);

        } else 

        // For other subcomponents when current_variable is not null
        if(current_variable!==null) {

            // If current variable is not null, then property/method calls are expected:
            //  Property call (DOT), Entry call (GROUP_CURLY) 
            if(attr[0].isChar(CharType.DOT)) {
                
                // This only applies to variable direct values **
                if(current_variable.type===ContextType.DIRECT_VALUE && 
                    current_variable.value_type===DirectValueType.VARIABLE)
                    isAnticipating = true;
                else throw(`CompileException: Unexpected '.' after non-variable object at `+
                    `line ${attr[2][0].line} `+
                    `column ${attr[2][0].column}`);

            } else if(attr[0].isOf(SubComponentType.GROUP_CURLY)) {

                // This only applies to variable direct values **
                if(current_variable.type===ContextType.DIRECT_VALUE && 
                    current_variable.value_type===DirectValueType.VARIABLE)
                    cumulative_calls.push(
                        new CallItem(CallType.ENTRY, processEntryGetter(attr),attr[2][0]));


                else throw(`CompileException: Unexpected '{' after non-variable object at `+
                    `line ${attr[2][0].line} `+
                    `column ${attr[2][0].column}`);

            } else 
                throw(`CompileException: Unexpected statement on left side of setter at `+
                `line ${attr[2][0].line} `+
                `column ${attr[2][0].column}`);
            

        } else 
            throw(`CompileException: Unexpected statement on left side of setter at `+
            `line ${attr[2][0].line} `+
            `column ${attr[2][0].column}`);
        
            
    }


    // Make sure there are no property anticipations
    if(isAnticipating) 
        throw(`CompileException: Left side of setter ended with '.' at `+
            `line ${last_subcomp[2][0].line} `+
            `column ${last_subcomp[2][0].column}`);

    
    // Close any open variables
    pushFeed();



    return {type, flags, feeds};


}