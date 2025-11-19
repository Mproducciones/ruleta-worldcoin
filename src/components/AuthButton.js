import { IDKitWidget } from '@worldcoin/idkit';
import { useMiniApp } from '@worldcoin/idkit/mini-app';
import React from 'react';

function AuthButton() {
  const { isReady, isAuthenticated } = useMiniApp();

  // Opcional: Puedes mostrar un mensaje de carga o de estado
  if (!isReady) {
    return <div>Cargando Worldcoin...</div>;
  }

  // Si ya está autenticado, puedes ocultar el botón
  if (isAuthenticated) {
    return <div>¡Autenticado!</div>;
  }

  return (
    <IDKitWidget
      app_id="app_staging_..." // Usa tu ID
      action="my_action" // Usa una acción
      onSuccess={result => console.log(result)}
    >
      {({ open }) => <button onClick={open}>Verificar con Worldcoin</button>}
    </IDKitWidget>
  );
}

export default AuthButton;