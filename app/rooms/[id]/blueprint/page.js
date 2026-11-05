import BlueprintClient from './BlueprintClient';
export default async function BlueprintPage({ params }) {
  const { id } = await params;
  return <BlueprintClient roomId={id} />;
}
