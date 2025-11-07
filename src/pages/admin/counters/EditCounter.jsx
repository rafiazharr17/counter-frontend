import { useParams } from "react-router-dom";

export default function EditCounter() {
  const { id } = useParams();
  return <div>Edit Counter ID: {id} (coming soon)</div>;
}
