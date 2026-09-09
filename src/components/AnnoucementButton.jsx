import { Megaphone } from "lucide-react";

function AnnouncementButton({
    onClick,
    disabled = false,
}) {
    return (
        <button
            className="announcement-button"
            onClick={onClick}
            disabled={disabled}
        >
            <Megaphone size={22} />

            Faire l'annonce
        </button>
    );
}

export default AnnouncementButton;