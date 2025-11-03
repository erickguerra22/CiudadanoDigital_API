select * from Mensaje order by messageid desc;
delete from Mensaje;

delete from Chat;
select * from Chat;

select * from Documento order by documentid;

delete from Documento where documentid != 30

SELECT * FROM Usuario

select * from Chat;
-- "Formación ciudadana para fortalecer la democracia"

SELECT 
      messageId, 
      chatId, 
      source, 
      content,
      reference,
      timestamp,
      assigned
    FROM Mensaje
    WHERE chatId = 1
	ORDER BY TIMESTAMP
	limit 5
	offset 0

select * from Mensaje order by timestamp desc;

SELECT * FROM CodigoRecuperacion;
SELECT * FROM Chat;

SELECT * FROM Sesion WHERE refreshid = '42520da5-25b5-4dcd-9e37-a257ac25fa27' AND revoked = false

SELECT userId, deviceId, refreshToken, expiresAt, revoked
             FROM Sesion 
             WHERE userId = 1 AND deviceId = '0' AND revoked = false
             ORDER BY createdAt DESC
             LIMIT 1

SELECT userId, email, names, lastnames, birthdate, phoneCode, phoneNumber, password FROM Usuario WHERE email = 'erickjrmunoz12@gmail.com'
select * from sesion order by createdat desc;

SELECT 
      userId, 
      email, 
      names, 
      lastnames, 
      birthdate, 
      phoneCode, 
      phoneNumber
    FROM Usuario
    WHERE userId = 1
    LIMIT 1