# sample-ink-flipper

A sample to interact with a deployed flipper contract.

Run via `yarn start`, this should yield an output such as -

```
getValue: output:: true

flipValue: gasLimit:: 585,245,879
flipValue (status) Ready
flipValue (status) {"InBlock":"0x5a8b166e6d39cccd40ab3e733c99bf9cca8586a3eabcef322863ab6d55fa3afa"}
flipValue (events/system) [
  'treasury.Deposit(["1.2009 Unit"])',
  'system.ExtrinsicSuccess([{"weight":"1,090,582,879","class":"Normal","paysFee":"Yes"}])'
]
flipValue (dispatch) {"weight":"1,090,582,879","class":"Normal","paysFee":"Yes"}

getValue: output:: false
```
