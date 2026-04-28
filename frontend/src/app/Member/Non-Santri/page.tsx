'use client';

import FaceIdCamera from '@/components/face-id-camera';

export default function MemberPage() {
  return (
    <FaceIdCamera
      title="Akses Member"
      description="Scan wajah Anda untuk akses gratis ke kolam renang"
      autoStart={true}
      scanMode={true}
      memberType="member"
    />
  );
}
