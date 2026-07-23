import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idUsuarioSesion = searchParams.get("id_usuario");
    const idCajeroParam = searchParams.get("id_usuario_cajero");
    const fechaInicio = searchParams.get("fecha_inicio");
    const fechaFin = searchParams.get("fecha_fin");
    const tipoPago = searchParams.get("tipo_pago");
    const metodoPago = searchParams.get("metodo_pago");

    if (!idUsuarioSesion) {
      return fail("Falta el id_usuario de sesión.", 400);
    }

    // 1. Identificar rol del usuario solicitante
    const { data: usuarioSesion, error: errUsuario } = await supabaseAdmin
      .from("usuarios")
      .select("id_usuario, roles(nombre)")
      .eq("id_usuario", idUsuarioSesion)
      .single();

    if (errUsuario || !usuarioSesion) {
      return fail("Usuario de sesión no encontrado.", 404);
    }

    const rol = usuarioSesion.roles?.nombre;
    let cajeroIdFiltro = null;

    if (rol === "cajero") {
      // El cajero SOLO puede ver sus propios pagos
      cajeroIdFiltro = usuarioSesion.id_usuario;
    } else if (rol === "admin") {
      // El admin puede filtrar por cualquier cajero o ver todos
      cajeroIdFiltro = idCajeroParam ? Number(idCajeroParam) : null;
    } else {
      return fail("Acceso denegado para este rol.", 403);
    }

    // 2. Armar query a la tabla pagos
    let query = supabaseAdmin
      .from("pagos")
      .select(`
        id_pago,
        tipo_pago,
        metodo_pago,
        monto_total,
        fecha_pago,
        fecha_vencimiento,
        estado_pago,
        id_usuario_cajero,
        id_usuario_colegiado,
        id_solicitud,
        cajeros:usuarios!pagos_id_usuario_cajero_fkey ( id_usuario, username )
      `)
      .eq("estado_pago", "pagado")
      .order("fecha_pago", { ascending: false });

    if (cajeroIdFiltro) {
      query = query.eq("id_usuario_cajero", cajeroIdFiltro);
    }

    if (tipoPago) {
      query = query.eq("tipo_pago", tipoPago);
    }

    if (metodoPago) {
      query = query.eq("metodo_pago", metodoPago);
    }

    if (fechaInicio) {
      query = query.gte("fecha_pago", `${fechaInicio}T00:00:00`);
    }

    if (fechaFin) {
      query = query.lte("fecha_pago", `${fechaFin}T23:59:59`);
    }

    const { data: pagos, error: errPagos } = await query;

    if (errPagos) {
      console.error("Error consultando pagos para reporte:", errPagos.message);
      return fail(errPagos.message, 500);
    }

    // 3. Obtener solicitudes para mapear nombres de colegiados
    const idsSolicitud = Array.from(
      new Set(pagos.map((p) => p.id_solicitud).filter(Boolean))
    );
    const idsColegiado = Array.from(
      new Set(pagos.map((p) => p.id_usuario_colegiado).filter(Boolean))
    );

    let solicitudesMap = new Map();

    if (idsSolicitud.length > 0 || idsColegiado.length > 0) {
      const { data: solicitudes } = await supabaseAdmin
        .from("solicitudes")
        .select("id_solicitud, id_usuario_colegiado, nombre_completo, dni");

      if (solicitudes) {
        solicitudes.forEach((s) => {
          if (s.id_solicitud) solicitudesMap.set(`sol_${s.id_solicitud}`, s);
          if (s.id_usuario_colegiado) solicitudesMap.set(`col_${s.id_usuario_colegiado}`, s);
        });
      }
    }

    // 4. Formatear resultados y calcular totales agregados
    let totalCobrado = 0;
    const porMetodoPago = { efectivo: 0, mercadopago: 0, yape: 0, plin: 0 };
    const porTipoPago = { inscripcion: 0, mensualidad: 0, otro: 0 };

    const pagosDetallados = pagos.map((p) => {
      const monto = Number(p.monto_total) || 0;
      totalCobrado += monto;

      if (porMetodoPago[p.metodo_pago] !== undefined) {
        porMetodoPago[p.metodo_pago] += monto;
      }

      if (porTipoPago[p.tipo_pago] !== undefined) {
        porTipoPago[p.tipo_pago] += monto;
      }

      const infoSolicitud =
        solicitudesMap.get(`sol_${p.id_solicitud}`) ||
        solicitudesMap.get(`col_${p.id_usuario_colegiado}`);

      return {
        id_pago: p.id_pago,
        fecha_pago: p.fecha_pago,
        tipo_pago: p.tipo_pago,
        metodo_pago: p.metodo_pago,
        monto_total: monto,
        estado_pago: p.estado_pago,
        colegiado: {
          nombre_completo: infoSolicitud?.nombre_completo || "Desconocido",
          dni: infoSolicitud?.dni || "—",
        },
        cajero: {
          id_usuario: p.cajeros?.id_usuario,
          username: p.cajeros?.username || "Sistema / Admin",
        },
      };
    });

    const resumen = {
      total_cobrado: Number(totalCobrado.toFixed(2)),
      cantidad_pagos: pagosDetallados.length,
      por_metodo_pago: {
        efectivo: Number((porMetodoPago.efectivo || 0).toFixed(2)),
        mercadopago: Number((porMetodoPago.mercadopago || 0).toFixed(2)),
        yape: Number((porMetodoPago.yape || 0).toFixed(2)),
        plin: Number((porMetodoPago.plin || 0).toFixed(2)),
      },
      por_tipo_pago: {
        inscripcion: Number((porTipoPago.inscripcion || 0).toFixed(2)),
        mensualidad: Number((porTipoPago.mensualidad || 0).toFixed(2)),
        otro: Number((porTipoPago.otro || 0).toFixed(2)),
      },
    };

    return ok({
      resumen,
      pagos: pagosDetallados,
    });
  } catch (err) {
    console.error("Error en GET /api/reportes/pagos-cajero:", err);
    return fail("Error interno procesando el reporte.", 500);
  }
}
