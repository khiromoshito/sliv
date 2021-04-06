
/** Processes a GROUP_BRACKET or SUBTYPE and returns a TypeContext */ 
function processType(type_subcomponent) {

    // types_subcomponent is either a group_bracket or a subtype,
    // which both contain subcontexts at [1]
    
    let types_arr = type_subcomponent[1];

    let types = [];

    for(let type_item of types_arr) {

        // Each type_item is a subcontext which contain types at [1]
        
        // A type item must only have a maximum of 2 children
        if(type_item[1].length>2)
            throw(`Unexpected ${type_item[1].length} elements `+
                `inside type (only max. 2 expected) at `+
                `line ${type_item[2][0].line} `+
                `column ${type_item[2][0].column}`);

        
        if(// If type item has 2 children, 
            // first child must be NAME and second as SUBTYPE 
            (type_item[1].length==2 && 
                !(type_item[1][0][0].isOf(SubComponentType.NAME) && 
                type_item[1][1][0].isOf(SubComponentType.SUBTYPE))) ||

            // If type item has 1 child, it must be NAME
            (type_item[1].length==1 && !type_item[1][0][0].isOf(SubComponentType.NAME)))

                throw(`Unexpected type format given (must be NAME or NAME<SUBTYPES>) at `+
                    `line ${type_item[2][0].line} `+
                    `column ${type_item[2][0].column}`);

            
        let type = new TypeItem();
        type.name = type_item[1][0][1];
        if(type_item[1][1]) type.subtype = processType(type_item[1][1]);
        
        types.push(type);
    }

    let typecontext = new TypeContext();
    typecontext.type_items = types;
    typecontext.start = type_subcomponent[2][0];
    typecontext.end = type_subcomponent[2][1];

    return typecontext;

}