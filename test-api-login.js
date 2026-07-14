const { loginSchema } = require("./apps/web/src/shared/validators/auth");
console.log(
  "Validator: ",
  loginSchema.safeParse({ email: " ibnalazhardocs@gmail.com ", password: "password" }),
);
