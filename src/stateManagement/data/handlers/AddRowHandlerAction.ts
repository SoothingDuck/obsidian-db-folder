import { RowDatabaseFields } from "cdm/DatabaseModel";
import { RowDataType, TableColumn } from "cdm/FolderModel";
import { LocalSettings } from "cdm/SettingsModel";
import { DataState, TableActionResponse } from "cdm/TableStateInterface";
import { DatabaseView } from "DatabaseView";
import { SourceDataTypes } from "helpers/Constants";
import { resolve_tfolder } from "helpers/FileManagement";
import { DateTime } from "luxon";
import { VaultManagerDB } from "services/FileManagerService";
import NoteInfo from "services/NoteInfo";
import { AbstractTableAction } from "stateManagement/AbstractTableAction";

export default class AddRowlHandlerAction extends AbstractTableAction<DataState> {
    handle(tableActionResponse: TableActionResponse<DataState>): TableActionResponse<DataState> {
        const { view, set, implementation } = tableActionResponse;
        implementation.actions.addRow = (filename: string, columns: TableColumn[], ddbbConfig: LocalSettings) => set((state) => {
            const destination_folder = this.destination_folder(view, ddbbConfig);
            let trimedFilename = filename.replace(/\.[^/.]+$/, "").trim();
            let filepath = `${destination_folder}/${trimedFilename}.md`;
            // Validate possible duplicates
            let sufixOfDuplicate = 0;
            while (state.rows.find((row) => row.__note__.filepath === filepath)) {
                sufixOfDuplicate++;
                filepath = `${destination_folder}/${trimedFilename}-${sufixOfDuplicate}.md`;
            }
            if (sufixOfDuplicate > 0) {
                trimedFilename = `${trimedFilename}-${sufixOfDuplicate}`;
                filename = `${trimedFilename} copy(${sufixOfDuplicate})`;
            }
            const rowRecord: RowDatabaseFields = { inline: {}, frontmatter: {} };
            columns
                .filter((column: TableColumn) => !column.isMetadata)
                .forEach((column: TableColumn) => {
                    if (column.config.isInline) {
                        rowRecord.inline[column.key] = "";
                    } else {
                        rowRecord.frontmatter[column.key] = "";
                    }
                });
            // Add note to persist row
            VaultManagerDB.create_markdown_file(
                resolve_tfolder(destination_folder),
                trimedFilename,
                rowRecord,
                ddbbConfig
            );

            const newNote = new NoteInfo({
                ...rowRecord.frontmatter,
                ...rowRecord.inline,
                file: {
                    path: filepath,
                    ctime: DateTime.now(),
                    mtime: DateTime.now(),
                    link: {
                        path: filepath,
                        fileName: () => filename,
                    },
                    tasks: [],
                },
            });

            const row: RowDataType = newNote.getRowDataType(columns, ddbbConfig);
            return { rows: [...state.rows, row] }
        });
        tableActionResponse.implementation = implementation;
        return this.goNext(tableActionResponse);
    }
    destination_folder(view: DatabaseView, ddbbConfig: LocalSettings): string {
        let destination_folder = view.file.parent.path;
        switch (ddbbConfig.source_data) {
            case SourceDataTypes.TAG:
            case SourceDataTypes.OUTGOING_LINK:
            case SourceDataTypes.INCOMING_LINK:
                destination_folder = ddbbConfig.source_destination_path;
                break;
            default:
            //Current folder
        }
        return destination_folder;
    }
}