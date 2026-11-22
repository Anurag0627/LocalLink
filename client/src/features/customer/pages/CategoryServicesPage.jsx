import { useParams } from 'react-router-dom';
import ServiceDiscoveryPage from './ServiceDiscoveryPage.jsx';

export default function CategoryServicesPage() {
  const { categoryId } = useParams();
  return <ServiceDiscoveryPage fixedCategory={categoryId} />;
}
