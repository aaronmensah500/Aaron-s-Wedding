import GuestPortal from "./GuestPortal";
import { GuestExperience } from "./wedding/ExtrasBlock";
import { useGuestSession } from "../lib/useGuestSession";

type GuestPageProps = { revision: number };

export default function GuestPage({ revision }: GuestPageProps) {
  const { session, authChecking } = useGuestSession();

  return (
    <>
      <GuestPortal session={session} authChecking={authChecking} />
      {session ? <GuestExperience key={revision} /> : null}
    </>
  );
}
