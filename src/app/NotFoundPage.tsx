import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";

export default function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <EmptyState
        title="Page not found"
        description="This route does not exist in the Group Building prototype."
        action={
          <Link to="/business/groups">
            <Button variant="outline" size="sm">
              Back to Groups
            </Button>
          </Link>
        }
      />
    </div>
  );
}
