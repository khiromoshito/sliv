

/** Processes GROUP_PARENTHESES as single-item values */
function processGroupValue(group_subcomponent) {
    
    // Must have only one item


    if(group_subcomponent[1].length>1)
        throw(`CompileException: Group values expect only one value, `+
            `but ${group_subcomponent[1].length} found, at `+
            `line ${group_subcomponent[2][0].line} `+
            `column ${group_subcomponent[2][0].column}`);


    if(group_subcomponent[1].length==0 || group_subcomponent[1][0][1].length==0)
        throw(`CompileException: Invalid empty group ( ) at `+
            `line ${group_subcomponent[2][0].line} `+
            `column ${group_subcomponent[2][0].column}`);


    return processValue(group_subcomponent[1][0][1]);
    
}
