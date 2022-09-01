import { ColumnSort } from "@tanstack/react-table";
import { InitialType, TableColumn } from "cdm/FolderModel";

function obtainInitialType(columns: TableColumn[]): InitialType {
    const initialType: InitialType = {};
    const sortElemList: ColumnSort[] = [];
    columns.forEach((column: TableColumn) => {
        if (column.isSorted) {
            sortElemList.push({
                id: column.key,
                desc: column.isSortedDesc
            });
        }
    });
    initialType.sortBy = sortElemList;
    return initialType;
}
export default obtainInitialType;