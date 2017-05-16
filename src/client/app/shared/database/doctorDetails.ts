export class DoctorDetails {
  name: string;
  picUrl: string;
  breifDescription: {
      speciality: string;
      experience: number;
      description: string;
  };
  status: string;
  waitingTime: number; // in seconds
  rating: number;
  videoUrl: string;
}
