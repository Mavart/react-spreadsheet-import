import React, { useCallback, useMemo, useState } from "react"
import { Box, Button, Heading, ModalBody, Switch } from "@chakra-ui/react"
import { ContinueButton } from "../../components/ContinueButton"
import { useRsi } from "../../hooks/useRsi"
import type { Meta } from "./types"
import { addErrorsAndRunHooks, addIndexes } from "./utils/dataMutations"
import { generateColumns } from "./components/columns"
import { Table } from "../../components/Table"
import { SubmitDataAlert } from "../../components/Alerts/SubmitDataAlert"
import type { Data } from "../../types"

type Props<T extends string> = {
  initialData: Data<T>[]
}

export const ValidationStep = <T extends string>({ initialData }: Props<T>) => {
  const { translations, fields, onClose, onSubmit, rowHook, tableHook, initialHook = (table) => table } = useRsi<T>()

  const [data, setData] = useState<(Data<T> & Meta)[]>(
    useMemo(() => addErrorsAndRunHooks<T>(addIndexes<T>(initialHook(initialData)), fields, rowHook, tableHook), []),
  )
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<number | string>>(new Set())
  const [filterByErrors, setFilterByErrors] = useState(false)
  const [showSubmitAlert, setShowSubmitAlert] = useState(false)

  const deleteSelectedRows = () => {
    if (selectedRows.size) {
      const newData = data.filter((value) => !selectedRows.has(value.__index))
      updateRow(newData)
      setSelectedRows(new Set())
    }
  }

  const updateRow = useCallback(
    (rows: typeof data) => {
      setData(addErrorsAndRunHooks<T>(rows, fields, rowHook, tableHook))
    },
    [setData, addErrorsAndRunHooks, rowHook, tableHook],
  )

  const columns = useMemo(() => generateColumns(fields), [fields, generateColumns])

  const tableData = useMemo(() => {
    if (filterByErrors) {
      return data.filter((value, index) => {
        const originalValue = data[index]
        if (originalValue?.__errors) {
          return Object.values(originalValue.__errors)?.filter((err) => err.level === "error").length
        }
        return false
      })
    }
    return data
  }, [data, filterByErrors])

  const rowKeyGetter = useCallback((row: Data<T> & Meta) => row.__index, [])

  const submitData = () => {
    const all = data.map(({ __index, __errors, ...value }) => ({ ...value })) as unknown as Data<T>[]
    const validData = all.filter((value, index) => {
      const originalValue = data[index]
      if (originalValue?.__errors) {
        return !Object.values(originalValue.__errors)?.filter((err) => err.level === "error").length
      }
      return true
    })
    const invalidData = all.filter((value) => !validData.includes(value))
    onSubmit({ validData, invalidData, all: data })
    onClose()
  }
  const onContinue = () => {
    const invalidData = data.find((value) => {
      if (value?.__errors) {
        return !!Object.values(value.__errors)?.filter((err) => err.level === "error").length
      }
      return false
    })
    if (!invalidData) {
      submitData()
    } else {
      setShowSubmitAlert(true)
    }
  }

  return (
    <>
      <SubmitDataAlert
        isOpen={showSubmitAlert}
        onClose={() => setShowSubmitAlert(false)}
        onConfirm={() => {
          setShowSubmitAlert(false)
          submitData()
        }}
      />
      <ModalBody pb={0}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb="2rem">
          <Heading size="lg" color="gray.700">
            {translations.validationStep.title}
          </Heading>
          <Box display="flex" gap="16px" alignItems="center">
            <Button variant="outline" size="sm" onClick={deleteSelectedRows}>
              {translations.validationStep.discardButtonTitle}
            </Button>
            <Switch display="flex" isChecked={filterByErrors} onChange={() => setFilterByErrors(!filterByErrors)}>
              {translations.validationStep.filterSwitchTitle}
            </Switch>
          </Box>
        </Box>
        <Table
          rowKeyGetter={rowKeyGetter}
          rows={tableData}
          onRowsChange={updateRow}
          columns={columns}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          components={{
            noRowsFallback: (
              <Box display="flex" justifyContent="center" gridColumn="1/-1" mt="32px">
                {filterByErrors
                  ? translations.validationStep.noRowsMessageWhenFiltered
                  : translations.validationStep.noRowsMessage}
              </Box>
            ),
          }}
        />
      </ModalBody>
      <ContinueButton onContinue={onContinue} title={translations.validationStep.nextButtonTitle} />
    </>
  )
}