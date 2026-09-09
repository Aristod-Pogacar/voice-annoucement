import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

import EmployeeSearch from "./components/EmployeeSearch";
import SelectedEmployee from "./components/SelectedEmployee";
import LocationSelect from "./components/LocationSelect";
import AnnouncementButton from "./components/AnnoucementButton";
import ReceptionPage from "./pages/ReceptionPage";

import api from "./api/api";

import "./App.css";

function App() {
  if (window.location.pathname === "/reception") {
    return <ReceptionPage />;
  }
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [location, setLocation] = useState("");

  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get("/employees");

        setEmployees(response.data);
      } catch (error) {
        console.error(
          "Erreur lors du chargement des employés :",
          error
        );

        alert("Impossible de charger les employés.");
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  const selectEmployee = (employee) => {
    const alreadySelected = selectedEmployees.some(
      (selected) => selected.id === employee.id
    );

    if (alreadySelected) {
      return;
    }

    setSelectedEmployees((current) => [
      ...current,
      employee,
    ]);
  };

  const removeEmployee = (employeeId) => {
    setSelectedEmployees((current) =>
      current.filter(
        (employee) => employee.id !== employeeId
      )
    );
  };

  const makeAnnouncement = async () => {
    if (selectedEmployees.length === 0) {
      alert("Veuillez sélectionner au moins un employé.");
      return;
    }

    if (!location) {
      alert("Veuillez sélectionner un lieu.");
      return;
    }

    const announcement = {
      employeeIds: selectedEmployees.map(
        (employee) => employee.id
      ),
      location: location,
    };

    try {
      const response = await api.post(
        "/announcements",
        announcement
      );

      console.log("Réponse du serveur :", response.data);

      alert("Annonce envoyée avec succès.");

    } catch (error) {
      console.error(
        "Erreur lors de l'envoi de l'annonce :",
        error
      );

      alert("Impossible d'envoyer l'annonce.");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-icon">
          <Megaphone size={28} />
        </div>

        <div>
          <h1>Voice Announcement</h1>
          <p>
            Faire une annonce à un ou plusieurs employés
          </p>
        </div>
      </header>

      <main className="container">
        {loadingEmployees ? (
          <div className="loading">
            Chargement des employés...
          </div>
        ) : (
          <div className="employees-container">
            <EmployeeSearch
              search={search}
              setSearch={setSearch}
              employees={employees}
              selectedEmployees={selectedEmployees}
              onSelectEmployee={selectEmployee}
            />

            <SelectedEmployee
              selectedEmployees={selectedEmployees}
              onRemoveEmployee={removeEmployee}
            />
          </div>
        )}

        <LocationSelect
          location={location}
          setLocation={setLocation}
        />

        <AnnouncementButton
          onClick={makeAnnouncement}
          disabled={
            selectedEmployees.length === 0 ||
            !location
          }
        />
      </main>
    </div>
  );
}

export default App;