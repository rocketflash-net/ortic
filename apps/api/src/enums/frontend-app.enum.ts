// Frontend yang memakai API: toko untuk pembeli (ortic.id) dan dashboard admin (admin.ortic.id).
const FrontendAppEnum = {
  web: "web",
  admin: "admin",
} as const;

type FrontendAppType = (typeof FrontendAppEnum)[keyof typeof FrontendAppEnum];

const FRONTEND_APPS = Object.values(FrontendAppEnum) as [FrontendAppType, ...FrontendAppType[]];

export default FrontendAppEnum;
export { FRONTEND_APPS, type FrontendAppType };
