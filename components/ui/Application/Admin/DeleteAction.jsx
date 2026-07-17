import { ListItemIcon, MenuItem } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";

const DeleteAction = ({ handleDelete, row, deleteType }) => {
  const isTrash = deleteType === "RSD" || deleteType === "PD";

  return (
    <MenuItem
      onClick={() => {
        handleDelete([row.original._id], isTrash ? "RSD" : "SD");
      }}
    >
      <ListItemIcon>
        {isTrash ? <RestoreFromTrashIcon /> : <DeleteIcon />}
      </ListItemIcon>

      {isTrash ? "Restore" : "Delete"}
    </MenuItem>
  );
};

export default DeleteAction;
