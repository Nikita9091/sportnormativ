import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/api';
import DisciplineList from './catalog/DisciplineList';
import NormativesTable from './catalog/NormativesTable';

const API = API_CONFIG.baseURL;

export default function NormativePage() {
  const { sport_id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const sport = state?.sport;
  const sportForComponents = {
    sport_name: sport?.name ?? `Вид спорта #${sport_id}`,
    sport_type: sport?.category ?? null,
  };

  const [disciplines, setDisciplines] = useState([]);
  const [disciplinesLoading, setDisciplinesLoading] = useState(true);

  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [normativesData, setNormativesData] = useState(null);
  const [normativesLoading, setNormativesLoading] = useState(false);

  useEffect(() => {
    setDisciplinesLoading(true);
    axios
      .get(`${API}/v_2/sports/${sport_id}/disciplines`)
      .then((res) => setDisciplines(res.data.disciplines ?? []))
      .catch(() => setDisciplines([]))
      .finally(() => setDisciplinesLoading(false));
  }, [sport_id]);

  const handleSelectDiscipline = (disc) => {
    setSelectedDiscipline(disc);
    setNormativesData(null);
    setNormativesLoading(true);
    axios
      .get(`${API}/v_1/disciplines/${disc.discipline_id}/normatives`)
      .then((res) => setNormativesData(res.data))
      .catch(() => setNormativesData(null))
      .finally(() => setNormativesLoading(false));
  };

  return (
    <div className="min-h-screen bg-[#F5F9F4] text-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {!selectedDiscipline ? (
          <DisciplineList
            sport={sportForComponents}
            disciplines={disciplines}
            loading={disciplinesLoading}
            onDisciplineSelect={handleSelectDiscipline}
            onBack={() => navigate('/catalog')}
          />
        ) : (
          <NormativesTable
            sport={sportForComponents}
            discipline={selectedDiscipline}
            data={normativesData}
            loading={normativesLoading}
            onBack={() => setSelectedDiscipline(null)}
          />
        )}
      </div>
    </div>
  );
}
