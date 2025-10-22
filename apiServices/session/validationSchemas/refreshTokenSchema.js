import yup from 'yup';

export const refreshTokenSchema = yup.object().shape({
    deviceId: yup
        .string()
        .required("El campo 'deviceId' es obligatorio."),
    refreshToken: yup
        .string()
        .required("El campo 'refreshToken' es obligatorio."),
})
    .noUnknown(true, 'Existen campos no permitidos en el cuerpo de la solicitud.');