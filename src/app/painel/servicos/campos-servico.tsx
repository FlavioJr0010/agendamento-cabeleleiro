import { AreaTexto, Campo } from "@/components/ui";
import { precoParaCampo } from "@/lib/formato";

type Valores = {
  nome?: string;
  descricao?: string | null;
  duracaoMin?: number;
  intervaloMin?: number;
  precoCentavos?: number;
};

/** Campos compartilhados entre "novo serviço" e "editar serviço". */
export function CamposServico({ valores = {}, prefixo = "" }: { valores?: Valores; prefixo?: string }) {
  const id = (nome: string) => `${prefixo}${nome}`;
  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <Campo
        rotulo="Nome do serviço"
        id={id("nome")}
        name="nome"
        defaultValue={valores.nome}
        placeholder="Ex.: Corte feminino"
        required
        maxLength={80}
        className="sm:col-span-6"
      />
      <Campo
        rotulo="Preço (R$)"
        id={id("preco")}
        name="preco"
        inputMode="decimal"
        defaultValue={valores.precoCentavos !== undefined ? precoParaCampo(valores.precoCentavos) : undefined}
        placeholder="80,00"
        required
        className="sm:col-span-2"
      />
      <Campo
        rotulo="Duração (min)"
        id={id("duracaoMin")}
        name="duracaoMin"
        type="number"
        min={5}
        max={600}
        step={5}
        defaultValue={valores.duracaoMin}
        placeholder="60"
        required
        className="sm:col-span-2"
      />
      <Campo
        rotulo="Intervalo após (min)"
        id={id("intervaloMin")}
        name="intervaloMin"
        type="number"
        min={0}
        max={120}
        step={5}
        defaultValue={valores.intervaloMin ?? 0}
        dica="Tempo de limpeza/preparação."
        className="sm:col-span-2"
      />
      <AreaTexto
        rotulo="Descrição (opcional)"
        id={id("descricao")}
        name="descricao"
        defaultValue={valores.descricao ?? ""}
        maxLength={500}
        placeholder="O que está incluso, indicações…"
        className="sm:col-span-6"
      />
    </div>
  );
}
