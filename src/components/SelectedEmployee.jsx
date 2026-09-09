import { X } from "lucide-react";

function SelectedEmployee({
    selectedEmployees,
    onRemoveEmployee,
}) {
    return (
        <section className="panel">

            <div className="panel-header">
                <div>
                    <h2>Personnes sélectionnées</h2>

                    <span>
                        {selectedEmployees.length} personne(s)
                    </span>
                </div>
            </div>

            <div className="employee-list">

                {selectedEmployees.length === 0 ? (

                    <div className="empty">

                        <div className="empty-icon">
                            👤
                        </div>

                        <p>
                            Aucune personne sélectionnée
                        </p>

                        <small>
                            Cliquez sur un employé dans les
                            résultats pour l'ajouter.
                        </small>

                    </div>

                ) : (

                    selectedEmployees.map((employee) => (

                        <div
                            className="selected-employee"
                            key={employee.id}
                        >

                            <div className="avatar">
                                {employee.name.charAt(0)}
                            </div>

                            <div className="employee-info">

                                <strong>
                                    {employee.name}
                                </strong>

                                <span>
                                    {employee.id}
                                </span>

                            </div>

                            <button
                                className="remove-button"
                                onClick={() =>
                                    onRemoveEmployee(employee.id)
                                }
                                title="Retirer"
                            >
                                <X size={18} />
                            </button>

                        </div>

                    ))

                )}

            </div>

        </section>
    );
}

export default SelectedEmployee;