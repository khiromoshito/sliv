
function evaluateCompare(comparecontext = new CompareContext(), address = "root") {

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