import type { FlowData } from '@/types/flow';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'qualification' | 'funnel' | 'direct';
  flow: FlowData;
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'lead-qualification',
    name: 'Calificacion de Leads',
    description: 'Flujo clasico de calificacion: saludo, recurso, preguntas de calificacion y derivacion segun respuestas.',
    category: 'qualification',
    flow: {
      nodes: [
        { id: 'start001', type: 'start', label: 'Inicio', position: { x: 400, y: 50 }, data: {} },
        { id: 'act001', type: 'action', label: 'Saludo + recurso', position: { x: 400, y: 200 }, data: { description: 'Saluda al lead y ofrece recurso gratuito' } },
        { id: 'dec001', type: 'decision', label: 'Tiene negocio?', position: { x: 400, y: 370 }, data: { condition: 'El lead tiene un negocio digital activo' } },
        { id: 'dec002', type: 'decision', label: 'Factura >$5k?', position: { x: 250, y: 540 }, data: { condition: 'El lead factura mas de $5k/mes' } },
        { id: 'act002', type: 'action', label: 'Enviar recurso free', position: { x: 600, y: 540 }, data: { description: 'Envia recurso gratuito para nutrir lead frio' } },
        { id: 'act003', type: 'action', label: 'Enviar link agenda', position: { x: 100, y: 710 }, data: { description: 'Envia link para agendar llamada de cierre' } },
        { id: 'act004', type: 'action', label: 'Ofrecer low ticket', position: { x: 400, y: 710 }, data: { description: 'Ofrece producto de bajo precio como entrada' } },
        { id: 'end001', type: 'end', label: 'Fin agenda', position: { x: 100, y: 860 }, data: {} },
        { id: 'end002', type: 'end', label: 'Fin low ticket', position: { x: 400, y: 860 }, data: {} },
        { id: 'end003', type: 'end', label: 'Fin recurso', position: { x: 600, y: 710 }, data: {} },
      ],
      edges: [
        { id: 'e-001', source: 'start001', target: 'act001' },
        { id: 'e-002', source: 'act001', target: 'dec001' },
        { id: 'e-003', source: 'dec001', target: 'dec002', label: 'Si', sourceHandle: 'yes' },
        { id: 'e-004', source: 'dec001', target: 'act002', label: 'No', sourceHandle: 'no' },
        { id: 'e-005', source: 'dec002', target: 'act003', label: 'Si', sourceHandle: 'yes' },
        { id: 'e-006', source: 'dec002', target: 'act004', label: 'No', sourceHandle: 'no' },
        { id: 'e-007', source: 'act003', target: 'end001' },
        { id: 'e-008', source: 'act004', target: 'end002' },
        { id: 'e-009', source: 'act002', target: 'end003' },
      ],
    },
  },
  {
    id: 'vsl-funnel',
    name: 'VSL Funnel',
    description: 'Embudo de ventas con video: keyword trigger, recurso, diagnostico, envio de VSL, seguimiento y agenda.',
    category: 'funnel',
    flow: {
      nodes: [
        { id: 'start001', type: 'start', label: 'Keyword trigger', position: { x: 400, y: 50 }, data: { description: 'Lead envia keyword o reacciona a historia' } },
        { id: 'act001', type: 'action', label: 'Enviar recurso', position: { x: 400, y: 200 }, data: { description: 'Envia PDF/guia gratuita como lead magnet' } },
        { id: 'act002', type: 'action', label: 'Diagnostico rapido', position: { x: 400, y: 350 }, data: { description: 'Hace 2-3 preguntas para entender situacion' } },
        { id: 'dec001', type: 'decision', label: 'Perfil califica?', position: { x: 400, y: 520 }, data: { condition: 'El lead encaja con el perfil ideal' } },
        { id: 'act003', type: 'action', label: 'Enviar VSL', position: { x: 250, y: 690 }, data: { description: 'Envia video de ventas personalizado' } },
        { id: 'act004', type: 'action', label: 'Seguimiento', position: { x: 250, y: 840 }, data: { description: 'Pregunta si vio el video, resuelve dudas' } },
        { id: 'dec002', type: 'decision', label: 'Quiere agendar?', position: { x: 250, y: 1010 }, data: { condition: 'El lead quiere agendar llamada' } },
        { id: 'act005', type: 'action', label: 'Enviar link agenda', position: { x: 100, y: 1180 }, data: { description: 'Envia link de Calendly para agendar' } },
        { id: 'act006', type: 'action', label: 'Nurture + recurso', position: { x: 550, y: 690 }, data: { description: 'Envia contenido de valor para nutrir' } },
        { id: 'end001', type: 'end', label: 'Fin agenda', position: { x: 100, y: 1330 }, data: {} },
        { id: 'end002', type: 'end', label: 'Fin seguimiento', position: { x: 400, y: 1180 }, data: {} },
        { id: 'end003', type: 'end', label: 'Fin nurture', position: { x: 550, y: 840 }, data: {} },
      ],
      edges: [
        { id: 'e-001', source: 'start001', target: 'act001' },
        { id: 'e-002', source: 'act001', target: 'act002' },
        { id: 'e-003', source: 'act002', target: 'dec001' },
        { id: 'e-004', source: 'dec001', target: 'act003', label: 'Si', sourceHandle: 'yes' },
        { id: 'e-005', source: 'dec001', target: 'act006', label: 'No', sourceHandle: 'no' },
        { id: 'e-006', source: 'act003', target: 'act004' },
        { id: 'e-007', source: 'act004', target: 'dec002' },
        { id: 'e-008', source: 'dec002', target: 'act005', label: 'Si', sourceHandle: 'yes' },
        { id: 'e-009', source: 'dec002', target: 'end002', label: 'No', sourceHandle: 'no' },
        { id: 'e-010', source: 'act005', target: 'end001' },
        { id: 'e-011', source: 'act006', target: 'end003' },
      ],
    },
  },
  {
    id: 'direct-close',
    name: 'Cierre Directo',
    description: 'Flujo rapido para cierre por chat: saludo, diagnostico express, precio con beneficios y cierre directo.',
    category: 'direct',
    flow: {
      nodes: [
        { id: 'start001', type: 'start', label: 'Inicio', position: { x: 400, y: 50 }, data: {} },
        { id: 'act001', type: 'action', label: 'Saludo personalizado', position: { x: 400, y: 200 }, data: { description: 'Saluda mencionando de donde viene el lead' } },
        { id: 'act002', type: 'action', label: 'Diagnostico rapido', position: { x: 400, y: 350 }, data: { description: '1-2 preguntas clave sobre su situacion' } },
        { id: 'dec001', type: 'decision', label: 'Encaja con oferta?', position: { x: 400, y: 520 }, data: { condition: 'El problema del lead se resuelve con la oferta' } },
        { id: 'act003', type: 'action', label: 'Precio + beneficios', position: { x: 250, y: 690 }, data: { description: 'Presenta precio, beneficios y garantia' } },
        { id: 'dec002', type: 'decision', label: 'Acepta?', position: { x: 250, y: 860 }, data: { condition: 'El lead acepta la oferta' } },
        { id: 'act004', type: 'action', label: 'Enviar link de pago', position: { x: 100, y: 1030 }, data: { description: 'Envia link de pago y confirma' } },
        { id: 'act005', type: 'action', label: 'Resolver objeciones', position: { x: 400, y: 1030 }, data: { description: 'Maneja objeciones con empati y prueba social' } },
        { id: 'act006', type: 'action', label: 'Redirigir a recurso', position: { x: 600, y: 690 }, data: { description: 'No encaja, ofrece alternativa o contenido' } },
        { id: 'end001', type: 'end', label: 'Fin venta', position: { x: 100, y: 1180 }, data: {} },
        { id: 'end002', type: 'end', label: 'Fin objecion', position: { x: 400, y: 1180 }, data: {} },
        { id: 'end003', type: 'end', label: 'Fin redirigido', position: { x: 600, y: 840 }, data: {} },
      ],
      edges: [
        { id: 'e-001', source: 'start001', target: 'act001' },
        { id: 'e-002', source: 'act001', target: 'act002' },
        { id: 'e-003', source: 'act002', target: 'dec001' },
        { id: 'e-004', source: 'dec001', target: 'act003', label: 'Si', sourceHandle: 'yes' },
        { id: 'e-005', source: 'dec001', target: 'act006', label: 'No', sourceHandle: 'no' },
        { id: 'e-006', source: 'act003', target: 'dec002' },
        { id: 'e-007', source: 'dec002', target: 'act004', label: 'Si', sourceHandle: 'yes' },
        { id: 'e-008', source: 'dec002', target: 'act005', label: 'No', sourceHandle: 'no' },
        { id: 'e-009', source: 'act004', target: 'end001' },
        { id: 'e-010', source: 'act005', target: 'end002' },
        { id: 'e-011', source: 'act006', target: 'end003' },
      ],
    },
  },
];

export const TEMPLATE_CATEGORY_LABELS: Record<FlowTemplate['category'], string> = {
  qualification: 'Calificacion',
  funnel: 'Embudo',
  direct: 'Cierre directo',
};
