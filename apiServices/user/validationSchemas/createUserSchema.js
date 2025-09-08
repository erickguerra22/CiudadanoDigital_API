import yup from 'yup';

export const createUserSchema = yup.object().shape({
  deviceId: yup
    .string()
    .required("El campo 'deviceId' es obligatorio."),
  password: yup
    .string()
    .min(6, "El campo 'password' debe tener al menos 6 caracteres.")
    .required("El campo 'password' es obligatorio."),
  phoneNumber: yup
    .string()
    .matches(/^[0-9]+$/, "El campo 'phoneNumber' debe contener solo números.")
    .required("El campo 'phoneNumber' es obligatorio."),
  phoneCode: yup
    .string()
    .matches(/\+[0-9]{1,3}/, "El campo 'phoneCode' debe tener un formato válido, por ejemplo, +502.")
    .required("El campo 'phoneCode' es obligatorio."),
  birthdate: yup
    .date()
    .nullable()
    .typeError("El campo 'birthdate' debe ser una fecha válida."),
  lastnames: yup
    .string()
    .required("El campo 'lastnames' es obligatorio."),
  names: yup
    .string()
    .required("El campo 'names' es obligatorio."),
  email: yup
    .string()
    .email("El campo 'email' debe tener un formato válido.")
    .required("El campo 'email' es obligatorio."),
})
  .noUnknown(true, 'Existen campos no permitidos en el cuerpo de la solicitud.');
