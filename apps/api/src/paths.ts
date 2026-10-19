import "module-alias/register";
import { addAliases } from "module-alias";

// Alias runtime. Harus selalu sama dengan "paths" di tsconfig.json
addAliases({
  "@base": `${__dirname}/base`,
  "@config": `${__dirname}/config`,
  "@controllers": `${__dirname}/controllers`,
  "@database": `${__dirname}/database`,
  "@dto": `${__dirname}/dto`,
  "@enums": `${__dirname}/enums`,
  "@exceptions": `${__dirname}/exceptions`,
  "@helpers": `${__dirname}/helpers`,
  "@interfaces": `${__dirname}/interfaces`,
  "@jobs": `${__dirname}/jobs`,
  "@middleware": `${__dirname}/middleware`,
  "@models": `${__dirname}/models`,
  "@registries": `${__dirname}/registries`,
  "@repositories": `${__dirname}/repositories`,
  "@routes": `${__dirname}/routes`,
  "@services": `${__dirname}/services`,
  "@@types": `${__dirname}/types`,
  "@utils": `${__dirname}/utils`,
  "@validators": `${__dirname}/validators`,
});
