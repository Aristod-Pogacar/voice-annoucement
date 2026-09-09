import { Search, Check } from "lucide-react";

function EmployeeSearch({
    search,
    setSearch,
    employees,
    selectedEmployees,
    onSelectEmployee,
}) {
    const filteredEmployees = employees.filter((employee) => {
        const query = search.toLowerCase().trim();

        if (!query) {
            return true;
        }

        return (
            employee.name.toLowerCase().includes(query) ||
            employee.id.toLowerCase().includes(query) ||
            employee.department.toLowerCase().includes(query)
        );
    });

    const isSelected = (employee) => {
        return selectedEmployees.some(
            (selected) => selected.id === employee.id
        );
    };

    return (
        <section className="panel">

            <div className="panel-header">
                <div>
                    <h2>Résultats</h2>

                    <span>
                        {filteredEmployees.length} employé(s)
                    </span>
                </div>
            </div>

            <div className="search-box">
                <Search size={18} />

                <input
                    type="text"
                    placeholder="Nom, matricule ou département..."
                    value={search}
                    onChange={(event) =>
                        setSearch(event.target.value)
                    }
                />
            </div>

            <div className="employee-list">

                {filteredEmployees.length === 0 ? (

                    <div className="empty">
                        Aucun employé trouvé.
                    </div>

                ) : (

                    filteredEmployees.map((employee) => (
                        <button
                            className={`employee ${isSelected(employee)
                                    ? "employee-selected"
                                    : ""
                                }`}
                            key={employee.id}
                            onClick={() =>
                                onSelectEmployee(employee)
                            }
                        >

                            <div className="avatar">
                                {employee.name.charAt(0)}
                            </div>

                            <div className="employee-info">
                                <strong>
                                    {employee.name}
                                </strong>

                                <span>
                                    {employee.id} • {employee.department}
                                </span>
                            </div>

                            {isSelected(employee) && (
                                <Check
                                    className="check"
                                    size={20}
                                />
                            )}

                        </button>
                    ))

                )}

            </div>

        </section>
    );
}

export default EmployeeSearch;