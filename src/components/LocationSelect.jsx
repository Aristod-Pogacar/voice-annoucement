import { MapPin } from "lucide-react";

function LocationSelect({
    location,
    setLocation,
}) {
    const locations = [
        "Bureau des Ressources Humaines",
        "Direction",
        "Réception",
        "Salle de réunion",
        "Service Informatique",
        "Production",
    ];

    return (
        <section className="location-section">

            <label htmlFor="location">
                Lieu de destination
            </label>

            <div className="location-box">

                <MapPin size={18} />

                <select
                    id="location"
                    value={location}
                    onChange={(event) =>
                        setLocation(event.target.value)
                    }
                >

                    <option value="">
                        Sélectionner un lieu...
                    </option>

                    {locations.map((item) => (
                        <option
                            value={item}
                            key={item}
                        >
                            {item}
                        </option>
                    ))}

                </select>

            </div>

        </section>
    );
}

export default LocationSelect;