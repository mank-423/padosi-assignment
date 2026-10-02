export type RootStackParamList = {
  // signed out
  Login: undefined;
  Register: undefined;
  VerifyOtp: { email: string; fromRegister?: boolean };
  // first login
  Profile: undefined;
  // main app
  Home: undefined;
  CategoryTasks: { categoryId: string; categoryName: string };
  Account: undefined;
  EditProfile: undefined;
};