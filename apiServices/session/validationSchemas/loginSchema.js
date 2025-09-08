import yup from 'yup';

export const loginSchema = yup.object().shape({
    deviceId: yup
        .string()
        .required("El campo 'deviceId' es obligatorio."),
    password: yup
        .string()
        .required("El campo 'password' es obligatorio."),
    email: yup
        .string()
        .email("El campo 'email' debe tener un formato válido.")
        .required("El campo 'email' es obligatorio."),
})
    .noUnknown(true, 'Existen campos no permitidos en el cuerpo de la solicitud.');